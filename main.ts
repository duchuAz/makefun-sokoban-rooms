import*as f from'node:fs'
let p
const S=(A,G,b,p,d,L,M)=>{const H={[p+'|'+b]:1}
let Z=[[p,b,M]]
while(Z.length){const nx=[]
for(const[q,bs,m]of Z){
for(let j=0;j<4;j++){const e=d[j],z=q+e,m2=m+'udlr'[j];if(A[z])continue
if(bs.includes(z)){const y=z+e;if(A[y]||bs.includes(y)||!L[y])continue
const b2=bs.map(v=>v==z?y:v).sort(),k=z+'|'+b2
if(H[k])continue
H[k]=1
if(b2.every(v=>G[v]))return[m2,z]
nx.push([z,b2,m2])}
else{const k=z+'|'+bs;if(H[k])continue
H[k]=1;Z.push([z,bs,m2])}}}
Z=nx}}
for(const id of f.readdirSync('/input')){let M=''
try{const s=f.readFileSync('/input/'+id+'/level.txt')+'',w=s.search(/\n/),z=s.replace(/\n/g,''),W=[...z].map(c=>+(c=='#')),G=[...z].map(c=>'.*+'.includes(c)),B=[...z.matchAll(/[$*]/g)].map(m=>m.index),P=z.search(/[@+]/),hr=P/w|0,d=[-w,w,-1,1],L=G.slice(),Q=G.flatMap((v,i)=>v?[i]:[]),D=[],V=[]
for(const q of Q)for(const e of d){const y=q-e;W[y]||W[y-e]||L[y]||(L[y]=1,Q.push(y))}
let at=P
for(const b of B)D[b]=1
for(const b of B)if(!V[b]){
const q2=[b],bs=[];V[b]=1
for(const q of q2){D[q]&&bs.push(q);for(const e of d){const y=q+e;W[y]||V[y]||(y/w|0)==hr&&!L[y]||(V[y]=1,q2.push(y))}}
const A=W.map((v,i)=>v|(D[i]&&!bs.includes(i)));A[at]=0
;[M,at]=S(A,G,bs,at,d,L,M)
for(const y of q2)D[y]=G[y]}
}catch{}
f.mkdirSync(p='/output/'+id,{recursive:!0});f.writeFileSync(p+'/solution.txt',M)}
