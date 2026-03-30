# -*- mode: python ; coding: utf-8 -*-

from PyInstaller.utils.hooks import collect_data_files, collect_submodules

hiddenimports = []
hiddenimports += collect_submodules("fastapi")
hiddenimports += collect_submodules("starlette")
hiddenimports += collect_submodules("uvicorn")
hiddenimports += collect_submodules("psycopg2")

datas = []
datas += collect_data_files("fastapi")
datas += collect_data_files("starlette")
datas += [("frontend/dist", "frontend/dist")]
datas += [("runtime_assets/.env.example", "runtime_assets")]
datas += [("runtime_assets/build_info.json", "runtime_assets")]

app = Analysis(
    ["timetracker_app.py"],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(app.pure)

exe = EXE(
    pyz,
    app.scripts,
    app.binaries,
    app.datas,
    [],
    name="TimeTracker",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

bundle = BUNDLE(
    exe,
    name="TimeTracker.app",
    icon=None,
    bundle_identifier="com.timetracker.app",
)
