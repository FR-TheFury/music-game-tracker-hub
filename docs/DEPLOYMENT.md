
# Déploiement sur GitHub Pages

Ce guide explique comment déployer l'application Music Game Tracker Hub sur GitHub Pages.

## Configuration automatique

Le workflow GitHub Actions est configuré pour déployer automatiquement l'application sur GitHub Pages à chaque push sur la branche `main`.

### Étapes de configuration

1. **Activer GitHub Pages** dans les paramètres du repository :
   - Aller dans Settings > Pages
   - Source : "GitHub Actions"

2. **Variables d'environnement** (optionnel) :
   - `VITE_BASE_URL` : nom du repository (configuré automatiquement)

3. **Pour les PR previews** (optionnel) :
   - Créer un compte Netlify
   - Ajouter les secrets `NETLIFY_AUTH_TOKEN` et `NETLIFY_SITE_ID`

## Workflow de déploiement

### Déploiement de production
- **Déclencheur** : Push sur la branche `main`
- **URL** : `https://username.github.io/repository-name/`

### Prévisualisations PR
- **Déclencheur** : Ouverture/mise à jour d'une Pull Request
- **URL** : Affichée dans un commentaire automatique sur la PR

## Structure des fichiers

```
.github/
├── workflows/
│   ├── deploy-github-pages.yml  # Déploiement principal
│   └── pr-preview.yml           # Prévisualisations PR
```

## Optimisations incluses

- **Code splitting** automatique (vendor, UI, Supabase)
- **Compression** des assets
- **Cache busting** pour les mises à jour
- **Fallback 404** pour le routing SPA
- **Base URL** dynamique pour les sous-dossiers

## Commandes de développement

```bash
# Développement local
npm run dev

# Build de production (test local)
npm run build
npm run preview

# Test du build GitHub Pages
VITE_BASE_URL=your-repo-name npm run build
```

## Support des fonctionnalités

✅ **Supporté sur GitHub Pages** :
- Interface utilisateur complète
- Authentification Supabase
- Gestion des artistes/jeux
- Affichage des nouvelles sorties

⚠️ **Limitations** :
- Les Edge Functions Supabase nécessitent une configuration séparée
- Les notifications email peuvent nécessiter des configurations supplémentaires

## Dépannage

### Problème : Page blanche après déploiement
- Vérifier que `base` est correctement configuré dans `vite.config.ts`
- S'assurer que le fichier `.nojekyll` est présent

### Problème : Routes 404
- Le fichier `404.html` gère la redirection pour le routing SPA
- Vérifier la configuration du router React

### Problème : Assets non trouvés
- Les chemins des assets doivent être relatifs
- Utiliser l'URL de base configurée automatiquement
