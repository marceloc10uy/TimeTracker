import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

def mount_react_spa(app: FastAPI) -> None:
    """
    Serve the Vite build output at:
        - /            -> index.html
        - /assets/*    -> static assets
        - /<anything>    -> SPA fallback to index.html (unless it's a real file)
    Assumes build output is at: /frontend/dist
    """
    if os.getenv("ENV") != "production":
        return

    base_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.abspath(os.path.join(base_dir, "..", "frontend", "dist"))
    assets_dir = os.path.join(dist_dir, "assets")

    # Helpful error if you forgot to build
    if not os.path.isdir(dist_dir):
        raise RuntimeError(f"Frontend dist folder not found: {dist_dir}. Run `npm run build` in /frontend.")
    if not os.path.isdir(assets_dir):
        raise RuntimeError(f"Frontend assets folder not found: {assets_dir}. Run `npm run build` in /frontend.")
    
    # Mount static assets first
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # Serve index at root
    @app.get("/", include_in_schema=False)
    def serve_index():
        return FileResponse(os.path.join(dist_dir, "index.html"))
    
    # Serve any real file if it exists, otherwise fallback to SPA index
    @app.get("/{path:path}", include_in_schema=False)
    def serve_spa(path: str):
        full_path = os.path.join(dist_dir, path)
        if os.path.isfile(full_path):
            return FileResponse(full_path)
        return FileResponse(os.path.join(dist_dir, "index.html"))