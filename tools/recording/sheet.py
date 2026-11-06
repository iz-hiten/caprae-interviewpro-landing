import sys, subprocess, glob, os, re
from PIL import Image
import shutil
FF=os.environ.get("FFMPEG") or shutil.which("ffmpeg") or "ffmpeg"
src=sys.argv[1]; step=float(sys.argv[2]) if len(sys.argv)>2 else 1.5
out=os.path.join(os.path.dirname(__file__),"out","sheet_"+os.path.basename(src).replace(".mp4",""))
os.makedirs(out,exist_ok=True); [os.remove(f) for f in glob.glob(out+"/*.jpg")]
info=subprocess.run([FF,"-i",src],capture_output=True,text=True).stderr
m=re.search(r"Duration: (\d+):(\d+):([\d.]+)",info); dur=int(m[1])*3600+int(m[2])*60+float(m[3])
print("duration %.1fs"%dur, re.search(r"Video: [^\n]*",info)[0][:90])
subprocess.run([FF,"-hide_banner","-loglevel","error","-i",src,"-vf",f"fps=1/{step},scale=480:-2",out+"/%03d.jpg"])
fr=sorted(glob.glob(out+"/*.jpg")); ims=[Image.open(f) for f in fr]
w,h=ims[0].size; cols=4; rows=(len(ims)+cols-1)//cols
g=Image.new("RGB",(cols*w,rows*h),"white")
for i,im in enumerate(ims): g.paste(im,((i%cols)*w,(i//cols)*h))
g.save(out+".png"); print(out+".png", len(ims))
