# Probe Visualizer

This is a React application to visualize probe predictions from a CSV file.

## How to Deploy to GitHub Pages

1.  **Set Your GitHub Username:**
    Open `package.json` and change the `homepage` field to reflect your GitHub username and repository name:
    ```json
    "homepage": "https://YOUR_GITHUB_USERNAME.github.io/reasoning-probe-classifier-visualizer",
    ```

2.  **Initialize Git and Push:**
    If you haven't already, initialize a git repository, commit your files, create a `main` branch, add your remote, and push:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin https://github.com/YOUR_GITHUB_USERNAME/reasoning-probe-classifier-visualizer.git
    git push -u origin main
    ```

3.  **Deploy:**
    Run the deploy script. This will build the application and push the contents of the `dist` folder to a new `gh-pages` branch on your repository.
    ```bash
    npm run deploy
    ```

4.  **Configure GitHub Pages:**
    - Go to your repository's settings on GitHub (`https://github.com/YOUR_GITHUB_USERNAME/reasoning-probe-classifier/settings`).
    - Navigate to the "Pages" section.
    - Under "Build and deployment", select `gh-pages` as the source branch.
    - Save the changes.

Your application should be live at the URL specified in your `homepage` field within a few minutes.
