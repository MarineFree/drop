// Interface storage minimaliste, agnostique de l'implémentation.
//
// Implémentations actuelles :
//   - FilesystemStorage (volume Dokploy persistant ou ./public/uploads en dev)
//
// Implémentations planifiées (sans toucher au code consommateur) :
//   - S3Storage (AWS S3, Minio, Hostinger Object Storage, R2)
//   - VercelBlobStorage (si on remet la feature sur un déploiement Vercel)
//
// Contrat : la `key` est canonique, c'est elle qui sert d'identifiant logique.
// Pour le filesystem, key = chemin relatif. Pour S3, key = object key.
// L'URL publique est dérivée par l'implémentation et stockée telle quelle dans
// `Drop.imageUrl`.

export interface StoragePutInput {
  /** Identifiant unique relatif (ex: `drops/<userId>/<timestamp>.jpg`). */
  key: string
  /** Données binaires à écrire. */
  data: Buffer
  /** MIME type — sert au get() ultérieur et aux headers HTTP. */
  contentType: string
}

export interface StoragePutResult {
  /** URL publique servable par un client (relative ou absolue selon backend). */
  url: string
  /** Clé canonique, à conserver si on veut re-get / delete plus tard. */
  key: string
}

export interface StorageGetResult {
  data: Buffer
  contentType: string
}

export interface Storage {
  /**
   * Écrit `data` sous la clé `key`. Crée les dossiers parents si besoin.
   * Si la clé existe déjà, l'écrasement est autorisé — l'appelant gère
   * l'unicité (typiquement via un timestamp dans la key).
   */
  put(input: StoragePutInput): Promise<StoragePutResult>

  /**
   * Lit le binaire stocké sous `key`, ou retourne `null` si absent.
   * L'appelant est responsable du contrôle d'accès — le storage ne tranche pas.
   */
  get(key: string): Promise<StorageGetResult | null>
}
