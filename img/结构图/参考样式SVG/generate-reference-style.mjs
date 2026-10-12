import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(out, '..', 'generate-structure-diagrams.mjs'), 'utf8');
const data = source.slice(source.indexOf('const trees = ') + 14, source.indexOf('\nconst style ='));
const trees = Function(`return (${data.trim()})`)();
const ordered = ['用户', '企业', '管理员'].map(role => trees.find(t => t.root === role));
const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const clean = s => s.replace(/\s+/g, '');
let parts, boxes;
function start(w, h, title) {
  parts = [`<?xml version="1.0" encoding="UTF-8"?>`, `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title"><title id="title">${esc(title)}</title><rect width="100%" height="100%" fill="white"/><g font-family="SimSun, Songti SC, serif" fill="black">`];
  boxes = [];
}
function line(x1,y1,x2,y2) { parts.push(`<path d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="black" stroke-width="2"/>`); }
function box(cx,y,w,h,label,vertical=false,size=22) {
  boxes.push({cx,y,w,h,label});
  parts.push(`<g><title>${esc(clean(label))}</title><rect x="${cx-w/2}" y="${y}" width="${w}" height="${h}" fill="white" stroke="black" stroke-width="1.3"/>`);
  const chars = vertical ? Array.from(clean(label)) : [label];
  const step = size * 1.15;
  const sy = y+h/2-(chars.length-1)*step/2;
  chars.forEach((c,i) => parts.push(`<text x="${cx}" y="${sy+i*step}" text-anchor="middle" dominant-baseline="central" font-size="${size}">${esc(c)}</text>`));
  parts.push('</g>');
}
function bus(parentX, parentBottom, xs, busY, childTop) {
  line(parentX,parentBottom,parentX,busY);
  line(Math.min(parentX,...xs),busY,Math.max(parentX,...xs),busY);
  xs.forEach(x=>line(x,busY,x,childTop));
}
function save(name,w,h) {
  for (const b of boxes) {
    if (b.cx-b.w/2<0 || b.cx+b.w/2>w || b.y<0 || b.y+b.h>h) throw Error(`Box outside canvas: ${b.label}`);
  }
  parts.push('</g></svg>');
  writeFileSync(join(out,name),parts.join('\n')+'\n','utf8');
  console.log(`${name}: ${w} × ${h}, ${boxes.length} nodes`);
}

mkdirSync(out,{recursive:true});
// 总图沿用参考图片的三层结构：系统名称 → 角色 → 竖排功能模块。
{
  const step=72, gap=110, margin=65;
  let cursor=margin;
  const roles=ordered.map(t=>{
    const xs=t.children.map((_,i)=>cursor+i*step);
    cursor=xs.at(-1)+gap;
    return {tree:t,xs,cx:(xs[0]+xs.at(-1))/2};
  });
  const w=roles.at(-1).xs.at(-1)+margin, h=655;
  start(w,h,'CareerNova 智聘 AI 系统功能结构图');
  bus(w/2,150,roles.map(r=>r.cx),195,235);
  roles.forEach(r=>bus(r.cx,310,r.xs,350,390));
  box(w/2,85,520,65,'CareerNova 智聘 AI 系统',false,26);
  roles.forEach(r=>{
    box(r.cx,235,230,75,r.tree.root,false,23);
    r.tree.children.forEach((m,i)=>box(r.xs[i],390,36,205,m.title,true,20));
  });
  save('系统功能结构图.svg',w,h);
}
// 详细图保留全部子功能，统一从上向下展开，直角边框、黑色连线。
for (const t of ordered) {
  let cursor=55;
  const groups=t.children.map(m=>{
    const xs=m.children.map((_,i)=>cursor+i*62);
    cursor=xs.at(-1)+100;
    return {m,xs,cx:(xs[0]+xs.at(-1))/2};
  });
  const w=groups.at(-1).xs.at(-1)+55,h=910;
  start(w,h,`${t.root}功能详细结构图`);
  bus(w/2,135,groups.map(g=>g.cx),180,225);
  groups.forEach(g=>bus(g.cx,455,g.xs,500,545));
  box(w/2,65,260,70,t.root,false,25);
  groups.forEach(g=>{
    box(g.cx,225,42,230,g.m.title,true,22);
    g.m.children.forEach((label,i)=>box(g.xs[i],545,36,285,label,true,20));
  });
  save(`结构图——${t.root}.svg`,w,h);
}
