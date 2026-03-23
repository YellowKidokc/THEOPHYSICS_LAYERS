@echo off
cd /d "C:\Users\lowes\Desktop\theophysics-layers"
"C:\Program Files\Git\cmd\git.exe" init
"C:\Program Files\Git\cmd\git.exe" add -A
"C:\Program Files\Git\cmd\git.exe" commit -m "Initial commit: Theophysics Layers plugin spec and skeleton"
"C:\Program Files\Git\cmd\git.exe" branch -M main
"C:\Program Files\Git\cmd\git.exe" remote add origin https://github.com/YellowKidokc/THEOPHYSICS_LAYERS.git
"C:\Program Files\Git\cmd\git.exe" push -u origin main
echo PUSH COMPLETE
pause
