$g = "C:\Program Files\Git\cmd\git.exe"
Set-Location "C:\Users\lowes\Desktop\theophysics-layers"
& $g init
& $g add -A
& $g commit -m "Initial commit: Theophysics Layers plugin spec + skeleton"
& $g branch -M main
& $g remote add origin https://github.com/YellowKidokc/THEOPHYSICS_LAYERS.git
& $g push -u origin main
Write-Host "PUSH COMPLETE"
