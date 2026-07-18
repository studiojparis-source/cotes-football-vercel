# Analyse des cotes football

Application web mobile-friendly pour analyser les cotes football à partir de fichiers Football-Data CSV/Excel.

## Fonctions

- Import CSV, XLSX, XLS
- Téléchargement Football-Data par championnat et saison
- Pack 10 ans
- Sauvegarde locale dans le navigateur
- Analyse des cotes 1/N/2
- Propositions par objectif de cote
- Tableau des matchs similaires

## Déploiement Vercel

1. Créer un repo GitHub.
2. Envoyer ces fichiers dans le repo.
3. Aller sur Vercel.
4. Importer le repo GitHub.
5. Déployer.

L'app fonctionne en frontend statique avec une petite API serverless Vercel pour récupérer les fichiers CSV Football-Data.

## Matchs du jour et résultats récents

Pour afficher les vrais matchs à venir et les matchs finis récents, ajoute une clé gratuite football-data.org :

```txt
FOOTBALL_DATA_TOKEN=ta_cle_football_data
```

En local, mets cette ligne dans `.env.local`.

Sur Vercel, ajoute la variable dans Project Settings -> Environment Variables, puis redéploie.

Cette API donne les calendriers et les scores. Elle ne donne pas les cotes bookmaker en gratuit.
