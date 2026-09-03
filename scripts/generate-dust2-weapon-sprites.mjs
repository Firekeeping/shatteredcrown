import sharp from "sharp";
import { access } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicDir = path.join(root, "public");
const generatedDeagle = path.resolve(root, "../generated_images/exec-71979cd6-b555-42f5-80d1-e6a0f07305f9.png");
const roles = ["walker", "lark", "gromm", "rowan", "alric", "veyra", "shade", "cinder", "tenzin", "garran", "ash", "vesper"];
const outfits = ["", "ballcap", "wifebeater", "ballcap-wifebeater"];

const deaglePath = path.join(publicDir, "dust2-dragonfire-deagle.png");

async function extractLightCheckerboard(input, output) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject:true });
  for (let i = 0; i < data.length; i += 4) {
    const r=data[i], g=data[i+1], b=data[i+2];
    const neutral = Math.max(r,g,b) - Math.min(r,g,b) < 13;
    if (neutral && Math.min(r,g,b) > 219) data[i+3] = 0;
  }
  await sharp(data, { raw:info }).trim({ background:{r:0,g:0,b:0,alpha:0} }).png().toFile(output);
}

const blueStrength = (r,g,b,a) => a > 30 && b > 115 && b > r * 1.18 && b > g * .78;

async function weaponlessAndAnchors(basePath, saberPath) {
  const [{info},{data:saber}] = await Promise.all([
    sharp(basePath).ensureAlpha().raw().toBuffer({resolveWithObject:true}),
    sharp(saberPath).ensureAlpha().raw().toBuffer({resolveWithObject:true}),
  ]);
  const base=Buffer.from(saber);
  const frameWidth=info.width/6;
  const anchors=[];
  for(let frame=0; frame<6; frame++) {
    const points=[];
    for(let y=0;y<info.height;y++) for(let x=frame*frameWidth;x<(frame+1)*frameWidth;x++) {
      const i=(y*info.width+x)*4;
      if(blueStrength(saber[i],saber[i+1],saber[i+2],saber[i+3])) points.push([x-frame*frameWidth,y]);
    }
    const cx=points.reduce((n,p)=>n+p[0],0)/(points.length||1), cy=points.reduce((n,p)=>n+p[1],0)/(points.length||1);
    const body={x:frameWidth*.5,y:info.height*.56};
    const sorted=points.toSorted((a,b)=>Math.hypot(a[0]-body.x,a[1]-body.y)-Math.hypot(b[0]-body.x,b[1]-body.y));
    const grip=sorted.slice(0,Math.max(1,Math.floor(sorted.length*.12)));
    const gx=grip.reduce((n,p)=>n+p[0],0)/(grip.length||1), gy=grip.reduce((n,p)=>n+p[1],0)/(grip.length||1);
    const tip=sorted.at(-1) || [cx,cy-40];
    anchors.push({x:gx||cx,y:gy||cy,angle:Math.atan2(tip[1]-(gy||cy),tip[0]-(gx||cx))*180/Math.PI});
  }
  // Erase only the blue blade and its glow from the authored lightsaber pose.
  // Keeping the rest of that sheet intact preserves faces, hands, clothes, and silhouettes.
  const erase=new Uint8Array(info.width*info.height);
  for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
    const i=(y*info.width+x)*4;
    if(blueStrength(saber[i],saber[i+1],saber[i+2],saber[i+3]))
      for(let oy=-3;oy<=3;oy++) for(let ox=-3;ox<=3;ox++) {
        const xx=x+ox, yy=y+oy;
        if(xx>=0&&yy>=0&&xx<info.width&&yy<info.height) erase[yy*info.width+xx]=1;
      }
  }
  for(let p=0;p<erase.length;p++) if(erase[p]) base[p*4+3]=0;
  return {data:base,info,frameWidth,anchors};
}

async function rotatedWeapon(input, kind, angle) {
  const width=kind==="awp"?138:52;
  const image=sharp(input).trim({background:{r:0,g:0,b:0,alpha:0}}).resize({width,fit:"inside"});
  // Source weapons point left. Rotate them so the muzzle follows the authored hand direction.
  return image.rotate(angle+180,{background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
}

async function makeSheet(prefix,outfit,kind,itemPath) {
  const stem=[prefix,outfit].filter(Boolean).join("-");
  const basePath=path.join(publicDir,`${stem}-sprites.png`);
  const saberPath=path.join(publicDir,`${stem}-lightsaber-sprites.png`);
  const {data,info,frameWidth,anchors}=await weaponlessAndAnchors(basePath,saberPath);
  let sheet=sharp(data,{raw:info});
  const composites=[];
  for(let frame=0;frame<6;frame++) {
    const authoredAngle = [180, 180, 180, 165, 180, 180][frame];
    const weapon=await rotatedWeapon(itemPath,kind,authoredAngle-180);
    const meta=await sharp(weapon).metadata();
    const downedShift=frame===4?{x:kind==="awp"?-12:-2,y:kind==="awp"?24:18}:{x:0,y:0};
    composites.push({input:weapon,left:Math.round(frame*frameWidth+anchors[frame].x-(meta.width||0)*.5+downedShift.x),top:Math.round(anchors[frame].y-(meta.height||0)*.54+downedShift.y)});
  }
  const output=path.join(publicDir,`${stem}-${kind}-sprites.png`);
  await sheet.composite(composites).png().toFile(output);
}

await access(generatedDeagle);
await extractLightCheckerboard(generatedDeagle,deaglePath);
const weapons={deagle:deaglePath,awp:path.join(publicDir,"dust2-dragon-glass-awp.png")};
for(const prefix of roles) for(const outfit of outfits) for(const [kind,itemPath] of Object.entries(weapons)) await makeSheet(prefix,outfit,kind,itemPath);
console.log(`Generated ${roles.length*outfits.length*Object.keys(weapons).length} wielding sheets.`);
