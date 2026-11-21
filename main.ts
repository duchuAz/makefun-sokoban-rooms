import*as f from'node:fs'
const I='/input',O='/output'
const S=(A,G,b,p,w,L)=>{const d=[-w,w,-1,1],X=[[b,p,-1,'']],seen=new Set([p+'|'+b]),R=i=>{let m='';for(;i>0;i=X[i][2])m=X[i][3]+m;return m}
let Z=[0]
while(Z.length){const nx=[]
for(const i of Z){const q=X[i][1],bs=X[i][0]
for(let j=0;j<4;j++){const e=d[j],z=q+e;if(A[z])continue
if(bs.includes(z)){const y=z+e;if(A[y]||bs.includes(y)||!L[y])continue
const b2=bs.map(v=>v==z?y:v).sort(),k=z+'|'+b2
if(seen.has(k))continue
seen.add(k);X.push([b2,z,i,'UDLR'[j]])
if(b2.every(v=>G[v]))return[R(X.length-1),z]
nx.push(X.length-1)}
else{const k=z+'|'+bs;if(seen.has(k))continue
seen.add(k);X.push([bs,z,i,'udlr'[j]]);Z.push(X.length-1)}}}
Z=nx}}
for(const id of f.readdirSync(I).sort()){let M=''
try{const s=f.readFileSync(I+'/'+id+'/level.txt','utf8'),w=s.indexOf('\n'),z=s.replace(/\n/g,''),n=z.length,W=[...z].map(c=>+(c=='#')),G=[...z].map(c=>+('.*+'.includes(c))),B=[...z].map((c,i)=>'$*'.includes(c)?i:-1).filter(i=>i>=0),P=z.search(/[@+]/),hr=P/w|0,d=[-w,w,-1,1],L=new Uint8Array(n),D=new Uint8Array(n),V=new Uint8Array(n),Q=[]
for(let i=0;i<n;i++)if(G[i])L[i]=1,Q.push(i)
for(let i=0;i<Q.length;i++)for(const e of d){const y=Q[i]-e;if(!W[y]&&!W[y-e]&&!L[y])L[y]=1,Q.push(y)}
let at=P,k=0
for(const b of B)D[b]=1
for(const b of B){if(V[b])continue
k++
const q2=[b],bs=[];V[b]=k
for(let i=0;i<q2.length;i++){const q=q2[i];if(D[q])bs.push(q);for(const e of d){const y=q+e;if(W[y]||V[y]==k||((y/w|0)==hr&&!L[y]))continue;V[y]=k;q2.push(y)}}
for(const x of bs)D[x]=0
const A=W.map((v,i)=>v|D[i]);A[at]=0
const r=S(A,G,bs,at,w,L)
if(!r)throw 0
M+=r[0];at=r[1]
for(const y of q2)if(G[y])D[y]=1}
}catch{}
f.mkdirSync(O+'/'+id,{recursive:!0});f.writeFileSync(O+'/'+id+'/solution.txt',M)}
