# Packaging TimeTracker For macOS

This project can be packaged as a macOS app bundle so the source tree is not the thing you launch day-to-day.

## What gets packaged

- Python backend
- Built frontend assets from `frontend/dist`

## What does not get packaged nicely

- Your `.env` secrets
- Your database contents

Those should stay outside the app bundle.

## Build on a Mac

From the project root:

```bash
chmod +x build_macos_app.command
./build_macos_app.command
```

Output:

```bash
dist/TimeTracker.app
```

## Build on a hosted macOS runner

If you do not want to build on your own Mac, this repo now includes a GitHub Actions workflow:

```text
.github/workflows/build-macos-app.yml
```

You can push the repo to GitHub and run the `Build macOS app` workflow from the Actions tab, or let it run automatically on `main` and pull requests.

Artifact output:

```bash
TimeTracker-macos.zip
```

That artifact contains the generated `TimeTracker.app` bundle built on GitHub's macOS runner.

## Runtime config

The packaged app looks for `.env` in these places:

1. Next to the app executable
2. One directory above the executable
3. `~/Library/Application Support/TimeTracker/.env`
4. Current working directory

Recommended location:

```bash
~/Library/Application Support/TimeTracker/.env
```

## Notes

- This is packaging/obscurity, not strong source-code protection.
- The frontend source is not needed at runtime; only the built `dist` assets are bundled.
- If you want stronger protection later, the next step would be code signing, notarization, and moving secrets/data fully outside the bundle.
