import path from 'node:path'
import { FilesystemStorage } from './filesystem'
import type { Storage } from './types'

// Singleton — instancié à la première demande, partagé par les routes.
// Le backend storage est résolu UNE fois au boot du serveur, jamais re-évalué.
let _storage: Storage | null = null

/**
 * Retourne l'implémentation Storage active.
 *
 * Sélection actuelle : FilesystemStorage uniquement (Dokploy volume en prod,
 * `./public/uploads` en dev). Le hook pour basculer vers S3/Minio plus tard
 * est ici : lire un env var `STORAGE_BACKEND=s3` et instancier S3Storage.
 */
export function getStorage(): Storage {
  if (_storage) return _storage

  const uploadDir = process.env.UPLOAD_DIR?.trim()
  // Fallback dev : `./public/uploads` → servi out-of-the-box par Next sans
  // route handler intermédiaire. Pratique en local. En prod, UPLOAD_DIR DOIT
  // être set sur le volume persistant Dokploy.
  const resolvedBase = uploadDir
    ? path.resolve(uploadDir)
    : path.resolve(process.cwd(), 'public', 'uploads')

  _storage = new FilesystemStorage(resolvedBase)
  return _storage
}

export type { Storage, StorageGetResult, StoragePutInput, StoragePutResult } from './types'
