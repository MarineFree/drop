import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Storage, StorageGetResult, StoragePutInput, StoragePutResult } from './types'

// Mapping extension → MIME type. Limité à ce qu'accepte l'upload route — pas
// besoin d'un package mime-db, on contrôle la palette autorisée en amont.
const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/**
 * Implémentation Storage qui écrit sur le filesystem.
 *
 * `baseDir` est le point de montage absolu. En prod Hostinger : volume Dokploy
 * persistant (ex: `/data/uploads`). En dev local : `./public/uploads` pour
 * profiter du serving direct de Next (les fichiers sous `public/` sont accessibles
 * à `/uploads/<path>`).
 *
 * **Sécurité** : chaque opération vérifie que la `key` ne sort PAS de `baseDir`
 * (anti path traversal `../../../etc/passwd`). Un `key` qui résout en dehors
 * de la racine est rejeté avec un throw côté put et un null côté get.
 */
export class FilesystemStorage implements Storage {
  private readonly baseDir: string

  constructor(baseDir: string) {
    // Normaliser une fois pour toutes — le check d'inclusion s'appuie dessus.
    this.baseDir = path.resolve(baseDir)
  }

  /**
   * Résout `key` en chemin absolu et garantit qu'il reste sous `baseDir`.
   * Retourne null si la résolution sort de la racine.
   */
  private resolveSafe(key: string): string | null {
    const target = path.resolve(this.baseDir, key)
    // Le chemin DOIT être strictement préfixé par baseDir + séparateur. Sans
    // le séparateur final, `/data/uploadsX` passerait le check, ce qui serait
    // un faux positif.
    if (target !== this.baseDir && !target.startsWith(this.baseDir + path.sep)) {
      return null
    }
    return target
  }

  async put({ key, data, contentType }: StoragePutInput): Promise<StoragePutResult> {
    const target = this.resolveSafe(key)
    if (!target) {
      throw new Error(`[FilesystemStorage] refusing out-of-root key: ${key}`)
    }
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, data)
    // L'URL publique est servie par la route /uploads/[...path] qui appelle
    // get() avec cette même key. Ne PAS hardcoder le scheme/host ici — c'est
    // une URL relative same-origin.
    return {
      key,
      url: `/uploads/${encodeKeyForUrl(key)}`,
    }
    // Le contentType est volontairement inutilisé en put filesystem : c'est
    // l'extension qui informe le get(). On l'accepte au signataire pour rester
    // homogène avec une future impl S3 où contentType est obligatoire à
    // l'object create.
    void contentType
  }

  async get(key: string): Promise<StorageGetResult | null> {
    const target = this.resolveSafe(key)
    if (!target) return null
    try {
      const data = await readFile(target)
      const ext = path.extname(target).slice(1).toLowerCase()
      const contentType = EXT_TO_MIME[ext] ?? 'application/octet-stream'
      return { data, contentType }
    } catch (err) {
      // ENOENT = clé absente → null. Tout autre fail = vraie erreur → propage.
      if (isFsNotFound(err)) return null
      throw err
    }
  }
}

function isFsNotFound(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'ENOENT'
  )
}

/**
 * `key` peut contenir des `/` (structure de dossiers) qu'on veut conserver dans
 * l'URL, mais les caractères "spéciaux" doivent être encodés (espaces, accents).
 * On découpe par `/`, on encode chaque segment, puis on rejoint.
 */
function encodeKeyForUrl(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/')
}
