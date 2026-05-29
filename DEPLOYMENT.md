# Deploiement GitHub Pages

Cette app est statique. Elle peut etre hebergee gratuitement avec GitHub Pages.

## Option recommandee

1. Creer un nouveau depot GitHub, par exemple `marketing-arena`.
2. Depuis ce dossier:

```powershell
git remote add origin https://github.com/VOTRE_COMPTE/marketing-arena.git
git push -u origin main
```

3. Sur GitHub: `Settings` -> `Pages`.
4. Source: `Deploy from a branch`.
5. Branch: `main`, dossier `/root`.
6. Le site sera disponible sur une URL du type:

```text
https://VOTRE_COMPTE.github.io/marketing-arena/
```

## Si GitHub CLI est installe

```powershell
gh repo create marketing-arena --public --source=. --remote=origin --push
```

Puis activer GitHub Pages dans les parametres du depot.
