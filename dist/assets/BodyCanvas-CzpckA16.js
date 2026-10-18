import{r as l,j as p,c as Mn,D as $e,M as An,a as Ln,b as he,d as yt}from"./index-uNWoINLT.js";import{m as Tn,e as Cn,u as Pn,a as Dn,b as Rn,c as _n,d as On,i as jn,E as Un,B as In,f as zn,T as kn,g as Y,h as Ke,D as lt,V as B,j as se,P as Xe,O as qe,R as Nn,S as St,Q as Nt,M as ce,k as Me,l as Bn,n as Hn,I as Fn,F as Bt,o as Mt,p as ke,W as Wn,q as Pt,r as sn,s as At,U as Ht,t as Ft,v as on,w as He,L as Yn,x as Gn,y as ve,C as ne,z as Lt,A as Vn,G as $n,H as Xn,J as qn,K as Le,N as an,X as Zn,Y as Kn,Z as Dt,_ as Ae,$ as cn,a0 as Qn,a1 as ln,a2 as Jn,a3 as er,a4 as tr}from"./bodyCanvasAssets-BlmmmthQ.js";function Wt(n,t){let r;return(...e)=>{window.clearTimeout(r),r=window.setTimeout(()=>n(...e),t)}}function nr({debounce:n,scroll:t,polyfill:r,offsetSize:e}={debounce:0,scroll:!1,offsetSize:!1}){const s=r||(typeof window>"u"?class{}:window.ResizeObserver);if(!s)throw new Error("This browser does not support ResizeObserver out of the box. See: https://github.com/react-spring/react-use-measure/#resize-observer-polyfills");const[o,u]=l.useState({left:0,top:0,width:0,height:0,bottom:0,right:0,x:0,y:0}),i=l.useRef({element:null,scrollContainers:null,resizeObserver:null,lastBounds:o,orientationHandler:null}),c=n?typeof n=="number"?n:n.scroll:null,m=n?typeof n=="number"?n:n.resize:null,f=l.useRef(!1);l.useEffect(()=>(f.current=!0,()=>{f.current=!1}));const[h,y,M]=l.useMemo(()=>{const x=()=>{if(!i.current.element)return;const{left:C,top:d,width:v,height:g,bottom:w,right:_,x:U,y:T}=i.current.element.getBoundingClientRect(),A={left:C,top:d,width:v,height:g,bottom:w,right:_,x:U,y:T};i.current.element instanceof HTMLElement&&e&&(A.height=i.current.element.offsetHeight,A.width=i.current.element.offsetWidth),Object.freeze(A),f.current&&!ir(i.current.lastBounds,A)&&u(i.current.lastBounds=A)};return[x,m?Wt(x,m):x,c?Wt(x,c):x]},[u,e,c,m]);function L(){i.current.scrollContainers&&(i.current.scrollContainers.forEach(x=>x.removeEventListener("scroll",M,!0)),i.current.scrollContainers=null),i.current.resizeObserver&&(i.current.resizeObserver.disconnect(),i.current.resizeObserver=null),i.current.orientationHandler&&("orientation"in screen&&"removeEventListener"in screen.orientation?screen.orientation.removeEventListener("change",i.current.orientationHandler):"onorientationchange"in window&&window.removeEventListener("orientationchange",i.current.orientationHandler))}function E(){i.current.element&&(i.current.resizeObserver=new s(M),i.current.resizeObserver.observe(i.current.element),t&&i.current.scrollContainers&&i.current.scrollContainers.forEach(x=>x.addEventListener("scroll",M,{capture:!0,passive:!0})),i.current.orientationHandler=()=>{M()},"orientation"in screen&&"addEventListener"in screen.orientation?screen.orientation.addEventListener("change",i.current.orientationHandler):"onorientationchange"in window&&window.addEventListener("orientationchange",i.current.orientationHandler))}const S=x=>{!x||x===i.current.element||(L(),i.current.element=x,i.current.scrollContainers=un(x),E())};return sr(M,!!t),rr(y),l.useEffect(()=>{L(),E()},[t,M,y]),l.useEffect(()=>L,[]),[S,o,h]}function rr(n){l.useEffect(()=>{const t=n;return window.addEventListener("resize",t),()=>{window.removeEventListener("resize",t)}},[n])}function sr(n,t){l.useEffect(()=>{if(t){const r=n;return window.addEventListener("scroll",r,{capture:!0,passive:!0}),()=>{window.removeEventListener("scroll",r,!0)}}},[n,t])}function un(n){const t=[];if(!n||n===document.body)return t;const{overflow:r,overflowX:e,overflowY:s}=window.getComputedStyle(n);return[r,e,s].some(o=>o==="auto"||o==="scroll")&&t.push(n),[...t,...un(n.parentElement)]}const or=["x","y","top","bottom","left","right","width","height"],ir=(n,t)=>or.every(r=>n[r]===t[r]);function ar({ref:n,children:t,fallback:r,resize:e,style:s,gl:o,events:u=On,eventSource:i,eventPrefix:c,shadows:m,linear:f,flat:h,legacy:y,orthographic:M,frameloop:L,dpr:E,performance:S,raycaster:x,camera:C,scene:d,onPointerMissed:v,onCreated:g,...w}){l.useMemo(()=>Cn(kn),[]);const _=Pn(),[U,T]=nr({scroll:!0,debounce:{scroll:50,resize:0},...e}),A=l.useRef(null),D=l.useRef(null);l.useImperativeHandle(n,()=>A.current);const H=Dn(v),[q,W]=l.useState(!1),[z,K]=l.useState(!1);if(q)throw q;if(z)throw z;const k=l.useRef(null);Rn(()=>{const X=A.current;if(T.width>0&&T.height>0&&X){k.current||(k.current=_n(X));async function Z(){await k.current.configure({gl:o,scene:d,events:u,shadows:m,linear:f,flat:h,legacy:y,orthographic:M,frameloop:L,dpr:E,performance:S,raycaster:x,camera:C,size:T,onPointerMissed:(...j)=>H.current==null?void 0:H.current(...j),onCreated:j=>{j.events.connect==null||j.events.connect(i?jn(i)?i.current:i:D.current),c&&j.setEvents({compute:(V,F)=>{const re=V[c+"X"],O=V[c+"Y"];F.pointer.set(re/F.size.width*2-1,-(O/F.size.height)*2+1),F.raycaster.setFromCamera(F.pointer,F.camera)}}),g?.(j)}}),k.current.render(p.jsx(_,{children:p.jsx(Un,{set:K,children:p.jsx(l.Suspense,{fallback:p.jsx(In,{set:W}),children:t??null})})}))}Z()}}),l.useEffect(()=>{const X=A.current;if(X)return()=>zn(X)},[]);const G=i?"none":"auto";return p.jsx("div",{ref:D,style:{position:"relative",width:"100%",height:"100%",overflow:"hidden",pointerEvents:G,...s},...w,children:p.jsx("div",{ref:U,style:{width:"100%",height:"100%"},children:p.jsx("canvas",{ref:A,style:{display:"block"},children:r})})})}function cr(n){return p.jsx(Tn,{children:p.jsx(ar,{...n})})}function De(){return De=Object.assign?Object.assign.bind():function(n){for(var t=1;t<arguments.length;t++){var r=arguments[t];for(var e in r)({}).hasOwnProperty.call(r,e)&&(n[e]=r[e])}return n},De.apply(null,arguments)}const Qe=new B,Rt=new B,lr=new B,Yt=new se;function ur(n,t,r){const e=Qe.setFromMatrixPosition(n.matrixWorld);e.project(t);const s=r.width/2,o=r.height/2;return[e.x*s+s,-(e.y*o)+o]}function dr(n,t){const r=Qe.setFromMatrixPosition(n.matrixWorld),e=Rt.setFromMatrixPosition(t.matrixWorld),s=r.sub(e),o=t.getWorldDirection(lr);return s.angleTo(o)>Math.PI/2}function fr(n,t,r,e){const s=Qe.setFromMatrixPosition(n.matrixWorld),o=s.clone();o.project(t),Yt.set(o.x,o.y),r.setFromCamera(Yt,t);const u=r.intersectObjects(e,!0);if(u.length){const i=u[0].distance;return s.distanceTo(r.ray.origin)<i}return!0}function mr(n,t){if(t instanceof qe)return t.zoom;if(t instanceof Xe){const r=Qe.setFromMatrixPosition(n.matrixWorld),e=Rt.setFromMatrixPosition(t.matrixWorld),s=t.fov*Math.PI/180,o=r.distanceTo(e);return 1/(2*Math.tan(s/2)*o)}else return 1}function hr(n,t,r){if(t instanceof Xe||t instanceof qe){const e=Qe.setFromMatrixPosition(n.matrixWorld),s=Rt.setFromMatrixPosition(t.matrixWorld),o=e.distanceTo(s),u=(r[1]-r[0])/(t.far-t.near),i=r[1]-u*t.far;return Math.round(u*o+i)}}const Tt=n=>Math.abs(n)<1e-10?0:n;function dn(n,t,r=""){let e="matrix3d(";for(let s=0;s!==16;s++)e+=Tt(t[s]*n.elements[s])+(s!==15?",":")");return r+e}const pr=(n=>t=>dn(t,n))([1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1]),vr=(n=>(t,r)=>dn(t,n(r),"translate(-50%,-50%)"))(n=>[1/n,1/n,1/n,1,-1/n,-1/n,-1/n,-1,1/n,1/n,1/n,1,1,1,1,1]);function gr(n){return n&&typeof n=="object"&&"current"in n}const _t=l.forwardRef(({children:n,eps:t=.001,style:r,className:e,prepend:s,center:o,fullscreen:u,portal:i,distanceFactor:c,sprite:m=!1,transform:f=!1,occlude:h,onOcclude:y,castShadow:M,receiveShadow:L,material:E,geometry:S,zIndexRange:x=[16777271,0],calculatePosition:C=ur,as:d="div",wrapperClass:v,pointerEvents:g="auto",...w},_)=>{const{gl:U,camera:T,scene:A,size:D,raycaster:H,events:q,viewport:W}=Y(),[z]=l.useState(()=>document.createElement(d)),K=l.useRef(null),k=l.useRef(null),G=l.useRef(0),X=l.useRef([0,0]),Z=l.useRef(null),j=l.useRef(null),V=i?.current||q.connected||U.domElement.parentNode,F=l.useRef(null),re=l.useRef(!1),O=l.useMemo(()=>h&&h!=="blending"||Array.isArray(h)&&h.length&&gr(h[0]),[h]);l.useLayoutEffect(()=>{const $=U.domElement;h&&h==="blending"?($.style.zIndex=`${Math.floor(x[0]/2)}`,$.style.position="absolute",$.style.pointerEvents="none"):($.style.zIndex=null,$.style.position=null,$.style.pointerEvents=null)},[h]),l.useLayoutEffect(()=>{if(k.current){const $=K.current=Mn.createRoot(z);if(A.updateMatrixWorld(),f)z.style.cssText="position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;";else{const I=C(k.current,T,D);z.style.cssText=`position:absolute;top:0;left:0;transform:translate3d(${I[0]}px,${I[1]}px,0);transform-origin:0 0;`}return V&&(s?V.prepend(z):V.appendChild(z)),()=>{V&&V.removeChild(z),$.unmount()}}},[V,f]),l.useLayoutEffect(()=>{v&&(z.className=v)},[v]);const we=l.useMemo(()=>f?{position:"absolute",top:0,left:0,width:D.width,height:D.height,transformStyle:"preserve-3d",pointerEvents:"none"}:{position:"absolute",transform:o?"translate3d(-50%,-50%,0)":"none",...u&&{top:-D.height/2,left:-D.width/2,width:D.width,height:D.height},...r},[r,o,u,D,f]),Re=l.useMemo(()=>({position:"absolute",pointerEvents:g}),[g]);l.useLayoutEffect(()=>{if(re.current=!1,f){var $;($=K.current)==null||$.render(l.createElement("div",{ref:Z,style:we},l.createElement("div",{ref:j,style:Re},l.createElement("div",{ref:_,className:e,style:r,children:n}))))}else{var I;(I=K.current)==null||I.render(l.createElement("div",{ref:_,style:we,className:e,children:n}))}});const oe=l.useRef(!0);Ke($=>{if(k.current){T.updateMatrixWorld(),k.current.updateWorldMatrix(!0,!1);const I=f?X.current:C(k.current,T,D);if(f||Math.abs(G.current-T.zoom)>t||Math.abs(X.current[0]-I[0])>t||Math.abs(X.current[1]-I[1])>t){const ie=dr(k.current,T);let ae=!1;O&&(Array.isArray(h)?ae=h.map(ue=>ue.current):h!=="blending"&&(ae=[A]));const Ee=oe.current;if(ae){const ue=fr(k.current,T,H,ae);oe.current=ue&&!ie}else oe.current=!ie;Ee!==oe.current&&(y?y(!oe.current):z.style.display=oe.current?"block":"none");const _e=Math.floor(x[0]/2),ft=h?O?[x[0],_e]:[_e-1,0]:x;if(z.style.zIndex=`${hr(k.current,T,ft)}`,f){const[ue,Fe]=[D.width/2,D.height/2],Oe=T.projectionMatrix.elements[5]*Fe,{isOrthographicCamera:et,top:mt,left:tt,bottom:We,right:Te}=T,ht=pr(T.matrixWorldInverse),pt=et?`scale(${Oe})translate(${Tt(-(Te+tt)/2)}px,${Tt((mt+We)/2)}px)`:`translateZ(${Oe}px)`;let de=k.current.matrixWorld;m&&(de=T.matrixWorldInverse.clone().transpose().copyPosition(de).scale(k.current.scale),de.elements[3]=de.elements[7]=de.elements[11]=0,de.elements[15]=1),z.style.width=D.width+"px",z.style.height=D.height+"px",z.style.perspective=et?"":`${Oe}px`,Z.current&&j.current&&(Z.current.style.transform=`${pt}${ht}translate(${ue}px,${Fe}px)`,j.current.style.transform=vr(de,1/((c||10)/400)))}else{const ue=c===void 0?1:mr(k.current,T)*c;z.style.transform=`translate3d(${I[0]}px,${I[1]}px,0) scale(${ue})`}X.current=I,G.current=T.zoom}}if(!O&&F.current&&!re.current)if(f){if(Z.current){const I=Z.current.children[0];if(I!=null&&I.clientWidth&&I!=null&&I.clientHeight){const{isOrthographicCamera:ie}=T;if(ie||S)w.scale&&(Array.isArray(w.scale)?w.scale instanceof B?F.current.scale.copy(w.scale.clone().divideScalar(1)):F.current.scale.set(1/w.scale[0],1/w.scale[1],1/w.scale[2]):F.current.scale.setScalar(1/w.scale));else{const ae=(c||10)/400,Ee=I.clientWidth*ae,_e=I.clientHeight*ae;F.current.scale.set(Ee,_e,1)}re.current=!0}}}else{const I=z.children[0];if(I!=null&&I.clientWidth&&I!=null&&I.clientHeight){const ie=1/W.factor,ae=I.clientWidth*ie,Ee=I.clientHeight*ie;F.current.scale.set(ae,Ee,1),re.current=!0}F.current.lookAt($.camera.position)}});const le=l.useMemo(()=>({vertexShader:f?void 0:`
          /*
            This shader is from the THREE's SpriteMaterial.
            We need to turn the backing plane into a Sprite
            (make it always face the camera) if "transfrom"
            is false.
          */
          #include <common>

          void main() {
            vec2 center = vec2(0., 1.);
            float rotation = 0.0;

            // This is somewhat arbitrary, but it seems to work well
            // Need to figure out how to derive this dynamically if it even matters
            float size = 0.03;

            vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
            vec2 scale;
            scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
            scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );

            bool isPerspective = isPerspectiveMatrix( projectionMatrix );
            if ( isPerspective ) scale *= - mvPosition.z;

            vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale * size;
            vec2 rotatedPosition;
            rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
            rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
            mvPosition.xy += rotatedPosition;

            gl_Position = projectionMatrix * mvPosition;
          }
      `,fragmentShader:`
        void main() {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        }
      `}),[f]);return l.createElement("group",De({},w,{ref:k}),h&&!O&&l.createElement("mesh",{castShadow:M,receiveShadow:L,ref:F},S||l.createElement("planeGeometry",null),E||l.createElement("shaderMaterial",{side:lt,vertexShader:le.vertexShader,fragmentShader:le.fragmentShader})))});function yr(n,t="pointer",r="auto",e=document.body){l.useEffect(()=>{if(n)return e.style.cursor=t,()=>{e.style.cursor=r}},[n])}const fn=parseInt(Nn.replace(/\D+/g,"")),mn=fn>=125?"uv1":"uv2";var xr=Object.defineProperty,br=(n,t,r)=>t in n?xr(n,t,{enumerable:!0,configurable:!0,writable:!0,value:r}):n[t]=r,wr=(n,t,r)=>(br(n,t+"",r),r);class Er{constructor(){wr(this,"_listeners")}addEventListener(t,r){this._listeners===void 0&&(this._listeners={});const e=this._listeners;e[t]===void 0&&(e[t]=[]),e[t].indexOf(r)===-1&&e[t].push(r)}hasEventListener(t,r){if(this._listeners===void 0)return!1;const e=this._listeners;return e[t]!==void 0&&e[t].indexOf(r)!==-1}removeEventListener(t,r){if(this._listeners===void 0)return;const s=this._listeners[t];if(s!==void 0){const o=s.indexOf(r);o!==-1&&s.splice(o,1)}}dispatchEvent(t){if(this._listeners===void 0)return;const e=this._listeners[t.type];if(e!==void 0){t.target=this;const s=e.slice(0);for(let o=0,u=s.length;o<u;o++)s[o].call(this,t);t.target=null}}}var Sr=Object.defineProperty,Mr=(n,t,r)=>t in n?Sr(n,t,{enumerable:!0,configurable:!0,writable:!0,value:r}):n[t]=r,P=(n,t,r)=>(Mr(n,typeof t!="symbol"?t+"":t,r),r);const rt=new Bn,Gt=new Hn,Ar=Math.cos(70*(Math.PI/180)),Vt=(n,t)=>(n%t+t)%t;let Lr=class extends Er{constructor(t,r){super(),P(this,"object"),P(this,"domElement"),P(this,"enabled",!0),P(this,"target",new B),P(this,"minDistance",0),P(this,"maxDistance",1/0),P(this,"minZoom",0),P(this,"maxZoom",1/0),P(this,"minPolarAngle",0),P(this,"maxPolarAngle",Math.PI),P(this,"minAzimuthAngle",-1/0),P(this,"maxAzimuthAngle",1/0),P(this,"enableDamping",!1),P(this,"dampingFactor",.05),P(this,"enableZoom",!0),P(this,"zoomSpeed",1),P(this,"enableRotate",!0),P(this,"rotateSpeed",1),P(this,"enablePan",!0),P(this,"panSpeed",1),P(this,"screenSpacePanning",!0),P(this,"keyPanSpeed",7),P(this,"zoomToCursor",!1),P(this,"autoRotate",!1),P(this,"autoRotateSpeed",2),P(this,"reverseOrbit",!1),P(this,"reverseHorizontalOrbit",!1),P(this,"reverseVerticalOrbit",!1),P(this,"keys",{LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"}),P(this,"mouseButtons",{LEFT:ce.ROTATE,MIDDLE:ce.DOLLY,RIGHT:ce.PAN}),P(this,"touches",{ONE:Me.ROTATE,TWO:Me.DOLLY_PAN}),P(this,"target0"),P(this,"position0"),P(this,"zoom0"),P(this,"_domElementKeyEvents",null),P(this,"getPolarAngle"),P(this,"getAzimuthalAngle"),P(this,"setPolarAngle"),P(this,"setAzimuthalAngle"),P(this,"getDistance"),P(this,"getZoomScale"),P(this,"listenToKeyEvents"),P(this,"stopListenToKeyEvents"),P(this,"saveState"),P(this,"reset"),P(this,"update"),P(this,"connect"),P(this,"dispose"),P(this,"dollyIn"),P(this,"dollyOut"),P(this,"getScale"),P(this,"setScale"),this.object=t,this.domElement=r,this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this.getPolarAngle=()=>f.phi,this.getAzimuthalAngle=()=>f.theta,this.setPolarAngle=a=>{let b=Vt(a,2*Math.PI),R=f.phi;R<0&&(R+=2*Math.PI),b<0&&(b+=2*Math.PI);let N=Math.abs(b-R);2*Math.PI-N<N&&(b<R?b+=2*Math.PI:R+=2*Math.PI),h.phi=b-R,e.update()},this.setAzimuthalAngle=a=>{let b=Vt(a,2*Math.PI),R=f.theta;R<0&&(R+=2*Math.PI),b<0&&(b+=2*Math.PI);let N=Math.abs(b-R);2*Math.PI-N<N&&(b<R?b+=2*Math.PI:R+=2*Math.PI),h.theta=b-R,e.update()},this.getDistance=()=>e.object.position.distanceTo(e.target),this.listenToKeyEvents=a=>{a.addEventListener("keydown",vt),this._domElementKeyEvents=a},this.stopListenToKeyEvents=()=>{this._domElementKeyEvents.removeEventListener("keydown",vt),this._domElementKeyEvents=null},this.saveState=()=>{e.target0.copy(e.target),e.position0.copy(e.object.position),e.zoom0=e.object.zoom},this.reset=()=>{e.target.copy(e.target0),e.object.position.copy(e.position0),e.object.zoom=e.zoom0,e.object.updateProjectionMatrix(),e.dispatchEvent(s),e.update(),c=i.NONE},this.update=(()=>{const a=new B,b=new B(0,1,0),R=new Nt().setFromUnitVectors(t.up,b),N=R.clone().invert(),Q=new B,ge=new Nt,Se=2*Math.PI;return function(){const kt=e.object.position;R.setFromUnitVectors(t.up,b),N.copy(R).invert(),a.copy(kt).sub(e.target),a.applyQuaternion(R),f.setFromVector3(a),e.autoRotate&&c===i.NONE&&W(H()),e.enableDamping?(f.theta+=h.theta*e.dampingFactor,f.phi+=h.phi*e.dampingFactor):(f.theta+=h.theta,f.phi+=h.phi);let ye=e.minAzimuthAngle,xe=e.maxAzimuthAngle;isFinite(ye)&&isFinite(xe)&&(ye<-Math.PI?ye+=Se:ye>Math.PI&&(ye-=Se),xe<-Math.PI?xe+=Se:xe>Math.PI&&(xe-=Se),ye<=xe?f.theta=Math.max(ye,Math.min(xe,f.theta)):f.theta=f.theta>(ye+xe)/2?Math.max(ye,f.theta):Math.min(xe,f.theta)),f.phi=Math.max(e.minPolarAngle,Math.min(e.maxPolarAngle,f.phi)),f.makeSafe(),e.enableDamping===!0?e.target.addScaledVector(M,e.dampingFactor):e.target.add(M),e.zoomToCursor&&T||e.object.isOrthographicCamera?f.radius=F(f.radius):f.radius=F(f.radius*y),a.setFromSpherical(f),a.applyQuaternion(N),kt.copy(e.target).add(a),e.object.matrixAutoUpdate||e.object.updateMatrix(),e.object.lookAt(e.target),e.enableDamping===!0?(h.theta*=1-e.dampingFactor,h.phi*=1-e.dampingFactor,M.multiplyScalar(1-e.dampingFactor)):(h.set(0,0,0),M.set(0,0,0));let Ye=!1;if(e.zoomToCursor&&T){let Ge=null;if(e.object instanceof Xe&&e.object.isPerspectiveCamera){const Ve=a.length();Ge=F(Ve*y);const nt=Ve-Ge;e.object.position.addScaledVector(_,nt),e.object.updateMatrixWorld()}else if(e.object.isOrthographicCamera){const Ve=new B(U.x,U.y,0);Ve.unproject(e.object),e.object.zoom=Math.max(e.minZoom,Math.min(e.maxZoom,e.object.zoom/y)),e.object.updateProjectionMatrix(),Ye=!0;const nt=new B(U.x,U.y,0);nt.unproject(e.object),e.object.position.sub(nt).add(Ve),e.object.updateMatrixWorld(),Ge=a.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),e.zoomToCursor=!1;Ge!==null&&(e.screenSpacePanning?e.target.set(0,0,-1).transformDirection(e.object.matrix).multiplyScalar(Ge).add(e.object.position):(rt.origin.copy(e.object.position),rt.direction.set(0,0,-1).transformDirection(e.object.matrix),Math.abs(e.object.up.dot(rt.direction))<Ar?t.lookAt(e.target):(Gt.setFromNormalAndCoplanarPoint(e.object.up,e.target),rt.intersectPlane(Gt,e.target))))}else e.object instanceof qe&&e.object.isOrthographicCamera&&(Ye=y!==1,Ye&&(e.object.zoom=Math.max(e.minZoom,Math.min(e.maxZoom,e.object.zoom/y)),e.object.updateProjectionMatrix()));return y=1,T=!1,Ye||Q.distanceToSquared(e.object.position)>m||8*(1-ge.dot(e.object.quaternion))>m?(e.dispatchEvent(s),Q.copy(e.object.position),ge.copy(e.object.quaternion),Ye=!1,!0):!1}})(),this.connect=a=>{e.domElement=a,e.domElement.style.touchAction="none",e.domElement.addEventListener("contextmenu",It),e.domElement.addEventListener("pointerdown",tt),e.domElement.addEventListener("pointercancel",Te),e.domElement.addEventListener("wheel",de)},this.dispose=()=>{var a,b,R,N,Q,ge;e.domElement&&(e.domElement.style.touchAction="auto"),(a=e.domElement)==null||a.removeEventListener("contextmenu",It),(b=e.domElement)==null||b.removeEventListener("pointerdown",tt),(R=e.domElement)==null||R.removeEventListener("pointercancel",Te),(N=e.domElement)==null||N.removeEventListener("wheel",de),(Q=e.domElement)==null||Q.ownerDocument.removeEventListener("pointermove",We),(ge=e.domElement)==null||ge.ownerDocument.removeEventListener("pointerup",Te),e._domElementKeyEvents!==null&&e._domElementKeyEvents.removeEventListener("keydown",vt)};const e=this,s={type:"change"},o={type:"start"},u={type:"end"},i={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6};let c=i.NONE;const m=1e-6,f=new St,h=new St;let y=1;const M=new B,L=new se,E=new se,S=new se,x=new se,C=new se,d=new se,v=new se,g=new se,w=new se,_=new B,U=new se;let T=!1;const A=[],D={};function H(){return 2*Math.PI/60/60*e.autoRotateSpeed}function q(){return Math.pow(.95,e.zoomSpeed)}function W(a){e.reverseOrbit||e.reverseHorizontalOrbit?h.theta+=a:h.theta-=a}function z(a){e.reverseOrbit||e.reverseVerticalOrbit?h.phi+=a:h.phi-=a}const K=(()=>{const a=new B;return function(R,N){a.setFromMatrixColumn(N,0),a.multiplyScalar(-R),M.add(a)}})(),k=(()=>{const a=new B;return function(R,N){e.screenSpacePanning===!0?a.setFromMatrixColumn(N,1):(a.setFromMatrixColumn(N,0),a.crossVectors(e.object.up,a)),a.multiplyScalar(R),M.add(a)}})(),G=(()=>{const a=new B;return function(R,N){const Q=e.domElement;if(Q&&e.object instanceof Xe&&e.object.isPerspectiveCamera){const ge=e.object.position;a.copy(ge).sub(e.target);let Se=a.length();Se*=Math.tan(e.object.fov/2*Math.PI/180),K(2*R*Se/Q.clientHeight,e.object.matrix),k(2*N*Se/Q.clientHeight,e.object.matrix)}else Q&&e.object instanceof qe&&e.object.isOrthographicCamera?(K(R*(e.object.right-e.object.left)/e.object.zoom/Q.clientWidth,e.object.matrix),k(N*(e.object.top-e.object.bottom)/e.object.zoom/Q.clientHeight,e.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),e.enablePan=!1)}})();function X(a){e.object instanceof Xe&&e.object.isPerspectiveCamera||e.object instanceof qe&&e.object.isOrthographicCamera?y=a:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),e.enableZoom=!1)}function Z(a){X(y/a)}function j(a){X(y*a)}function V(a){if(!e.zoomToCursor||!e.domElement)return;T=!0;const b=e.domElement.getBoundingClientRect(),R=a.clientX-b.left,N=a.clientY-b.top,Q=b.width,ge=b.height;U.x=R/Q*2-1,U.y=-(N/ge)*2+1,_.set(U.x,U.y,1).unproject(e.object).sub(e.object.position).normalize()}function F(a){return Math.max(e.minDistance,Math.min(e.maxDistance,a))}function re(a){L.set(a.clientX,a.clientY)}function O(a){V(a),v.set(a.clientX,a.clientY)}function we(a){x.set(a.clientX,a.clientY)}function Re(a){E.set(a.clientX,a.clientY),S.subVectors(E,L).multiplyScalar(e.rotateSpeed);const b=e.domElement;b&&(W(2*Math.PI*S.x/b.clientHeight),z(2*Math.PI*S.y/b.clientHeight)),L.copy(E),e.update()}function oe(a){g.set(a.clientX,a.clientY),w.subVectors(g,v),w.y>0?Z(q()):w.y<0&&j(q()),v.copy(g),e.update()}function le(a){C.set(a.clientX,a.clientY),d.subVectors(C,x).multiplyScalar(e.panSpeed),G(d.x,d.y),x.copy(C),e.update()}function $(a){V(a),a.deltaY<0?j(q()):a.deltaY>0&&Z(q()),e.update()}function I(a){let b=!1;switch(a.code){case e.keys.UP:G(0,e.keyPanSpeed),b=!0;break;case e.keys.BOTTOM:G(0,-e.keyPanSpeed),b=!0;break;case e.keys.LEFT:G(e.keyPanSpeed,0),b=!0;break;case e.keys.RIGHT:G(-e.keyPanSpeed,0),b=!0;break}b&&(a.preventDefault(),e.update())}function ie(){if(A.length==1)L.set(A[0].pageX,A[0].pageY);else{const a=.5*(A[0].pageX+A[1].pageX),b=.5*(A[0].pageY+A[1].pageY);L.set(a,b)}}function ae(){if(A.length==1)x.set(A[0].pageX,A[0].pageY);else{const a=.5*(A[0].pageX+A[1].pageX),b=.5*(A[0].pageY+A[1].pageY);x.set(a,b)}}function Ee(){const a=A[0].pageX-A[1].pageX,b=A[0].pageY-A[1].pageY,R=Math.sqrt(a*a+b*b);v.set(0,R)}function _e(){e.enableZoom&&Ee(),e.enablePan&&ae()}function ft(){e.enableZoom&&Ee(),e.enableRotate&&ie()}function ue(a){if(A.length==1)E.set(a.pageX,a.pageY);else{const R=gt(a),N=.5*(a.pageX+R.x),Q=.5*(a.pageY+R.y);E.set(N,Q)}S.subVectors(E,L).multiplyScalar(e.rotateSpeed);const b=e.domElement;b&&(W(2*Math.PI*S.x/b.clientHeight),z(2*Math.PI*S.y/b.clientHeight)),L.copy(E)}function Fe(a){if(A.length==1)C.set(a.pageX,a.pageY);else{const b=gt(a),R=.5*(a.pageX+b.x),N=.5*(a.pageY+b.y);C.set(R,N)}d.subVectors(C,x).multiplyScalar(e.panSpeed),G(d.x,d.y),x.copy(C)}function Oe(a){const b=gt(a),R=a.pageX-b.x,N=a.pageY-b.y,Q=Math.sqrt(R*R+N*N);g.set(0,Q),w.set(0,Math.pow(g.y/v.y,e.zoomSpeed)),Z(w.y),v.copy(g)}function et(a){e.enableZoom&&Oe(a),e.enablePan&&Fe(a)}function mt(a){e.enableZoom&&Oe(a),e.enableRotate&&ue(a)}function tt(a){var b,R;e.enabled!==!1&&(A.length===0&&((b=e.domElement)==null||b.ownerDocument.addEventListener("pointermove",We),(R=e.domElement)==null||R.ownerDocument.addEventListener("pointerup",Te)),En(a),a.pointerType==="touch"?bn(a):ht(a))}function We(a){e.enabled!==!1&&(a.pointerType==="touch"?wn(a):pt(a))}function Te(a){var b,R,N;Sn(a),A.length===0&&((b=e.domElement)==null||b.releasePointerCapture(a.pointerId),(R=e.domElement)==null||R.ownerDocument.removeEventListener("pointermove",We),(N=e.domElement)==null||N.ownerDocument.removeEventListener("pointerup",Te)),e.dispatchEvent(u),c=i.NONE}function ht(a){let b;switch(a.button){case 0:b=e.mouseButtons.LEFT;break;case 1:b=e.mouseButtons.MIDDLE;break;case 2:b=e.mouseButtons.RIGHT;break;default:b=-1}switch(b){case ce.DOLLY:if(e.enableZoom===!1)return;O(a),c=i.DOLLY;break;case ce.ROTATE:if(a.ctrlKey||a.metaKey||a.shiftKey){if(e.enablePan===!1)return;we(a),c=i.PAN}else{if(e.enableRotate===!1)return;re(a),c=i.ROTATE}break;case ce.PAN:if(a.ctrlKey||a.metaKey||a.shiftKey){if(e.enableRotate===!1)return;re(a),c=i.ROTATE}else{if(e.enablePan===!1)return;we(a),c=i.PAN}break;default:c=i.NONE}c!==i.NONE&&e.dispatchEvent(o)}function pt(a){if(e.enabled!==!1)switch(c){case i.ROTATE:if(e.enableRotate===!1)return;Re(a);break;case i.DOLLY:if(e.enableZoom===!1)return;oe(a);break;case i.PAN:if(e.enablePan===!1)return;le(a);break}}function de(a){e.enabled===!1||e.enableZoom===!1||c!==i.NONE&&c!==i.ROTATE||(a.preventDefault(),e.dispatchEvent(o),$(a),e.dispatchEvent(u))}function vt(a){e.enabled===!1||e.enablePan===!1||I(a)}function bn(a){switch(zt(a),A.length){case 1:switch(e.touches.ONE){case Me.ROTATE:if(e.enableRotate===!1)return;ie(),c=i.TOUCH_ROTATE;break;case Me.PAN:if(e.enablePan===!1)return;ae(),c=i.TOUCH_PAN;break;default:c=i.NONE}break;case 2:switch(e.touches.TWO){case Me.DOLLY_PAN:if(e.enableZoom===!1&&e.enablePan===!1)return;_e(),c=i.TOUCH_DOLLY_PAN;break;case Me.DOLLY_ROTATE:if(e.enableZoom===!1&&e.enableRotate===!1)return;ft(),c=i.TOUCH_DOLLY_ROTATE;break;default:c=i.NONE}break;default:c=i.NONE}c!==i.NONE&&e.dispatchEvent(o)}function wn(a){switch(zt(a),c){case i.TOUCH_ROTATE:if(e.enableRotate===!1)return;ue(a),e.update();break;case i.TOUCH_PAN:if(e.enablePan===!1)return;Fe(a),e.update();break;case i.TOUCH_DOLLY_PAN:if(e.enableZoom===!1&&e.enablePan===!1)return;et(a),e.update();break;case i.TOUCH_DOLLY_ROTATE:if(e.enableZoom===!1&&e.enableRotate===!1)return;mt(a),e.update();break;default:c=i.NONE}}function It(a){e.enabled!==!1&&a.preventDefault()}function En(a){A.push(a)}function Sn(a){delete D[a.pointerId];for(let b=0;b<A.length;b++)if(A[b].pointerId==a.pointerId){A.splice(b,1);return}}function zt(a){let b=D[a.pointerId];b===void 0&&(b=new se,D[a.pointerId]=b),b.set(a.pageX,a.pageY)}function gt(a){const b=a.pointerId===A[0].pointerId?A[1]:A[0];return D[b.pointerId]}this.dollyIn=(a=q())=>{j(a),e.update()},this.dollyOut=(a=q())=>{Z(a),e.update()},this.getScale=()=>y,this.setScale=a=>{X(a),e.update()},this.getZoomScale=()=>q(),r!==void 0&&this.connect(r),this.update()}};const Tr={uniforms:{tDiffuse:{value:null},h:{value:1/512}},vertexShader:`
      varying vec2 vUv;

      void main() {

        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

      }
  `,fragmentShader:`
    uniform sampler2D tDiffuse;
    uniform float h;

    varying vec2 vUv;

    void main() {

    	vec4 sum = vec4( 0.0 );

    	sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * 0.051;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * 0.0918;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * 0.12245;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * 0.1531;
    	sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * 0.1531;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * 0.12245;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * 0.0918;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * 0.051;

    	gl_FragColor = sum;

    }
  `},Cr={uniforms:{tDiffuse:{value:null},v:{value:1/512}},vertexShader:`
    varying vec2 vUv;

    void main() {

      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    }
  `,fragmentShader:`

  uniform sampler2D tDiffuse;
  uniform float v;

  varying vec2 vUv;

  void main() {

    vec4 sum = vec4( 0.0 );

    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.051;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.0918;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.12245;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.1531;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.1531;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.12245;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.0918;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.051;

    gl_FragColor = sum;

  }
  `},$t=new Pt,st=new B;class Ot extends Fn{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const t=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],r=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],e=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(e),this.setAttribute("position",new Bt(t,3)),this.setAttribute("uv",new Bt(r,2))}applyMatrix4(t){const r=this.attributes.instanceStart,e=this.attributes.instanceEnd;return r!==void 0&&(r.applyMatrix4(t),e.applyMatrix4(t),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(t){let r;t instanceof Float32Array?r=t:Array.isArray(t)&&(r=new Float32Array(t));const e=new Mt(r,6,1);return this.setAttribute("instanceStart",new ke(e,3,0)),this.setAttribute("instanceEnd",new ke(e,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(t,r=3){let e;t instanceof Float32Array?e=t:Array.isArray(t)&&(e=new Float32Array(t));const s=new Mt(e,r*2,1);return this.setAttribute("instanceColorStart",new ke(s,r,0)),this.setAttribute("instanceColorEnd",new ke(s,r,r)),this}fromWireframeGeometry(t){return this.setPositions(t.attributes.position.array),this}fromEdgesGeometry(t){return this.setPositions(t.attributes.position.array),this}fromMesh(t){return this.fromWireframeGeometry(new Wn(t.geometry)),this}fromLineSegments(t){const r=t.geometry;return this.setPositions(r.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Pt);const t=this.attributes.instanceStart,r=this.attributes.instanceEnd;t!==void 0&&r!==void 0&&(this.boundingBox.setFromBufferAttribute(t),$t.setFromBufferAttribute(r),this.boundingBox.union($t))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new sn),this.boundingBox===null&&this.computeBoundingBox();const t=this.attributes.instanceStart,r=this.attributes.instanceEnd;if(t!==void 0&&r!==void 0){const e=this.boundingSphere.center;this.boundingBox.getCenter(e);let s=0;for(let o=0,u=t.count;o<u;o++)st.fromBufferAttribute(t,o),s=Math.max(s,e.distanceToSquared(st)),st.fromBufferAttribute(r,o),s=Math.max(s,e.distanceToSquared(st));this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(t){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(t)}}class hn extends Ot{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(t){const r=t.length-3,e=new Float32Array(2*r);for(let s=0;s<r;s+=3)e[2*s]=t[s],e[2*s+1]=t[s+1],e[2*s+2]=t[s+2],e[2*s+3]=t[s+3],e[2*s+4]=t[s+4],e[2*s+5]=t[s+5];return super.setPositions(e),this}setColors(t,r=3){const e=t.length-r,s=new Float32Array(2*e);if(r===3)for(let o=0;o<e;o+=r)s[2*o]=t[o],s[2*o+1]=t[o+1],s[2*o+2]=t[o+2],s[2*o+3]=t[o+3],s[2*o+4]=t[o+4],s[2*o+5]=t[o+5];else for(let o=0;o<e;o+=r)s[2*o]=t[o],s[2*o+1]=t[o+1],s[2*o+2]=t[o+2],s[2*o+3]=t[o+3],s[2*o+4]=t[o+4],s[2*o+5]=t[o+5],s[2*o+6]=t[o+6],s[2*o+7]=t[o+7];return super.setColors(s,r),this}fromLine(t){const r=t.geometry;return this.setPositions(r.attributes.position.array),this}}class jt extends At{constructor(t){super({type:"LineMaterial",uniforms:Ht.clone(Ht.merge([Ft.common,Ft.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new se(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
				#include <common>
				#include <fog_pars_vertex>
				#include <logdepthbuf_pars_vertex>
				#include <clipping_planes_pars_vertex>

				uniform float linewidth;
				uniform vec2 resolution;

				attribute vec3 instanceStart;
				attribute vec3 instanceEnd;

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
						attribute vec4 instanceColorStart;
						attribute vec4 instanceColorEnd;
					#else
						varying vec3 vLineColor;
						attribute vec3 instanceColorStart;
						attribute vec3 instanceColorEnd;
					#endif
				#endif

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#ifdef USE_DASH

					uniform float dashScale;
					attribute float instanceDistanceStart;
					attribute float instanceDistanceEnd;
					varying float vLineDistance;

				#endif

				void trimSegment( const in vec4 start, inout vec4 end ) {

					// trim end segment so it terminates between the camera plane and the near plane

					// conservative estimate of the near plane
					float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
					float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
					float nearEstimate = - 0.5 * b / a;

					float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

					end.xyz = mix( start.xyz, end.xyz, alpha );

				}

				void main() {

					#ifdef USE_COLOR

						vLineColor = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

					#endif

					#ifdef USE_DASH

						vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
						vUv = uv;

					#endif

					float aspect = resolution.x / resolution.y;

					// camera space
					vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
					vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

					#ifdef WORLD_UNITS

						worldStart = start.xyz;
						worldEnd = end.xyz;

					#else

						vUv = uv;

					#endif

					// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
					// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
					// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
					// perhaps there is a more elegant solution -- WestLangley

					bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

					if ( perspective ) {

						if ( start.z < 0.0 && end.z >= 0.0 ) {

							trimSegment( start, end );

						} else if ( end.z < 0.0 && start.z >= 0.0 ) {

							trimSegment( end, start );

						}

					}

					// clip space
					vec4 clipStart = projectionMatrix * start;
					vec4 clipEnd = projectionMatrix * end;

					// ndc space
					vec3 ndcStart = clipStart.xyz / clipStart.w;
					vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

					// direction
					vec2 dir = ndcEnd.xy - ndcStart.xy;

					// account for clip-space aspect ratio
					dir.x *= aspect;
					dir = normalize( dir );

					#ifdef WORLD_UNITS

						// get the offset direction as perpendicular to the view vector
						vec3 worldDir = normalize( end.xyz - start.xyz );
						vec3 offset;
						if ( position.y < 0.5 ) {

							offset = normalize( cross( start.xyz, worldDir ) );

						} else {

							offset = normalize( cross( end.xyz, worldDir ) );

						}

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						float forwardOffset = dot( worldDir, vec3( 0.0, 0.0, 1.0 ) );

						// don't extend the line if we're rendering dashes because we
						// won't be rendering the endcaps
						#ifndef USE_DASH

							// extend the line bounds to encompass  endcaps
							start.xyz += - worldDir * linewidth * 0.5;
							end.xyz += worldDir * linewidth * 0.5;

							// shift the position of the quad so it hugs the forward edge of the line
							offset.xy -= dir * forwardOffset;
							offset.z += 0.5;

						#endif

						// endcaps
						if ( position.y > 1.0 || position.y < 0.0 ) {

							offset.xy += dir * 2.0 * forwardOffset;

						}

						// adjust for linewidth
						offset *= linewidth * 0.5;

						// set the world position
						worldPos = ( position.y < 0.5 ) ? start : end;
						worldPos.xyz += offset;

						// project the worldpos
						vec4 clip = projectionMatrix * worldPos;

						// shift the depth of the projected points so the line
						// segments overlap neatly
						vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
						clip.z = clipPose.z * clip.w;

					#else

						vec2 offset = vec2( dir.y, - dir.x );
						// undo aspect ratio adjustment
						dir.x /= aspect;
						offset.x /= aspect;

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						// endcaps
						if ( position.y < 0.0 ) {

							offset += - dir;

						} else if ( position.y > 1.0 ) {

							offset += dir;

						}

						// adjust for linewidth
						offset *= linewidth;

						// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
						offset /= resolution.y;

						// select end
						vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

						// back to clip space
						offset *= clip.w;

						clip.xy += offset;

					#endif

					gl_Position = clip;

					vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

					#include <logdepthbuf_vertex>
					#include <clipping_planes_vertex>
					#include <fog_vertex>

				}
			`,fragmentShader:`
				uniform vec3 diffuse;
				uniform float opacity;
				uniform float linewidth;

				#ifdef USE_DASH

					uniform float dashOffset;
					uniform float dashSize;
					uniform float gapSize;

				#endif

				varying float vLineDistance;

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#include <common>
				#include <fog_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <clipping_planes_pars_fragment>

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
					#else
						varying vec3 vLineColor;
					#endif
				#endif

				vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

					float mua;
					float mub;

					vec3 p13 = p1 - p3;
					vec3 p43 = p4 - p3;

					vec3 p21 = p2 - p1;

					float d1343 = dot( p13, p43 );
					float d4321 = dot( p43, p21 );
					float d1321 = dot( p13, p21 );
					float d4343 = dot( p43, p43 );
					float d2121 = dot( p21, p21 );

					float denom = d2121 * d4343 - d4321 * d4321;

					float numer = d1343 * d4321 - d1321 * d4343;

					mua = numer / denom;
					mua = clamp( mua, 0.0, 1.0 );
					mub = ( d1343 + d4321 * ( mua ) ) / d4343;
					mub = clamp( mub, 0.0, 1.0 );

					return vec2( mua, mub );

				}

				void main() {

					#include <clipping_planes_fragment>

					#ifdef USE_DASH

						if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

						if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

					#endif

					float alpha = opacity;

					#ifdef WORLD_UNITS

						// Find the closest points on the view ray and the line segment
						vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
						vec3 lineDir = worldEnd - worldStart;
						vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

						vec3 p1 = worldStart + lineDir * params.x;
						vec3 p2 = rayEnd * params.y;
						vec3 delta = p1 - p2;
						float len = length( delta );
						float norm = len / linewidth;

						#ifndef USE_DASH

							#ifdef USE_ALPHA_TO_COVERAGE

								float dnorm = fwidth( norm );
								alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

							#else

								if ( norm > 0.5 ) {

									discard;

								}

							#endif

						#endif

					#else

						#ifdef USE_ALPHA_TO_COVERAGE

							// artifacts appear on some hardware if a derivative is taken within a conditional
							float a = vUv.x;
							float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
							float len2 = a * a + b * b;
							float dlen = fwidth( len2 );

							if ( abs( vUv.y ) > 1.0 ) {

								alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

							}

						#else

							if ( abs( vUv.y ) > 1.0 ) {

								float a = vUv.x;
								float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
								float len2 = a * a + b * b;

								if ( len2 > 1.0 ) discard;

							}

						#endif

					#endif

					vec4 diffuseColor = vec4( diffuse, alpha );
					#ifdef USE_COLOR
						#ifdef USE_LINE_COLOR_ALPHA
							diffuseColor *= vLineColor;
						#else
							diffuseColor.rgb *= vLineColor;
						#endif
					#endif

					#include <logdepthbuf_fragment>

					gl_FragColor = diffuseColor;

					#include <tonemapping_fragment>
					#include <${fn>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(r){this.uniforms.diffuse.value=r}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(r){r===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(r){this.uniforms.linewidth.value=r}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(r){!!r!="USE_DASH"in this.defines&&(this.needsUpdate=!0),r===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(r){this.uniforms.dashScale.value=r}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(r){this.uniforms.dashSize.value=r}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(r){this.uniforms.dashOffset.value=r}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(r){this.uniforms.gapSize.value=r}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(r){this.uniforms.opacity.value=r}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(r){this.uniforms.resolution.value.copy(r)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(r){!!r!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),r===!0?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(t)}}const xt=new He,Xt=new B,qt=new B,J=new He,ee=new He,fe=new He,bt=new B,wt=new Gn,te=new Yn,Zt=new B,ot=new Pt,it=new sn,me=new He;let pe,Pe;function Kt(n,t,r){return me.set(0,0,-t,1).applyMatrix4(n.projectionMatrix),me.multiplyScalar(1/me.w),me.x=Pe/r.width,me.y=Pe/r.height,me.applyMatrix4(n.projectionMatrixInverse),me.multiplyScalar(1/me.w),Math.abs(Math.max(me.x,me.y))}function Pr(n,t){const r=n.matrixWorld,e=n.geometry,s=e.attributes.instanceStart,o=e.attributes.instanceEnd,u=Math.min(e.instanceCount,s.count);for(let i=0,c=u;i<c;i++){te.start.fromBufferAttribute(s,i),te.end.fromBufferAttribute(o,i),te.applyMatrix4(r);const m=new B,f=new B;pe.distanceSqToSegment(te.start,te.end,f,m),f.distanceTo(m)<Pe*.5&&t.push({point:f,pointOnLine:m,distance:pe.origin.distanceTo(f),object:n,face:null,faceIndex:i,uv:null,[mn]:null})}}function Dr(n,t,r){const e=t.projectionMatrix,o=n.material.resolution,u=n.matrixWorld,i=n.geometry,c=i.attributes.instanceStart,m=i.attributes.instanceEnd,f=Math.min(i.instanceCount,c.count),h=-t.near;pe.at(1,fe),fe.w=1,fe.applyMatrix4(t.matrixWorldInverse),fe.applyMatrix4(e),fe.multiplyScalar(1/fe.w),fe.x*=o.x/2,fe.y*=o.y/2,fe.z=0,bt.copy(fe),wt.multiplyMatrices(t.matrixWorldInverse,u);for(let y=0,M=f;y<M;y++){if(J.fromBufferAttribute(c,y),ee.fromBufferAttribute(m,y),J.w=1,ee.w=1,J.applyMatrix4(wt),ee.applyMatrix4(wt),J.z>h&&ee.z>h)continue;if(J.z>h){const d=J.z-ee.z,v=(J.z-h)/d;J.lerp(ee,v)}else if(ee.z>h){const d=ee.z-J.z,v=(ee.z-h)/d;ee.lerp(J,v)}J.applyMatrix4(e),ee.applyMatrix4(e),J.multiplyScalar(1/J.w),ee.multiplyScalar(1/ee.w),J.x*=o.x/2,J.y*=o.y/2,ee.x*=o.x/2,ee.y*=o.y/2,te.start.copy(J),te.start.z=0,te.end.copy(ee),te.end.z=0;const E=te.closestPointToPointParameter(bt,!0);te.at(E,Zt);const S=ve.lerp(J.z,ee.z,E),x=S>=-1&&S<=1,C=bt.distanceTo(Zt)<Pe*.5;if(x&&C){te.start.fromBufferAttribute(c,y),te.end.fromBufferAttribute(m,y),te.start.applyMatrix4(u),te.end.applyMatrix4(u);const d=new B,v=new B;pe.distanceSqToSegment(te.start,te.end,v,d),r.push({point:v,pointOnLine:d,distance:pe.origin.distanceTo(v),object:n,face:null,faceIndex:y,uv:null,[mn]:null})}}}class pn extends on{constructor(t=new Ot,r=new jt({color:Math.random()*16777215})){super(t,r),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const t=this.geometry,r=t.attributes.instanceStart,e=t.attributes.instanceEnd,s=new Float32Array(2*r.count);for(let u=0,i=0,c=r.count;u<c;u++,i+=2)Xt.fromBufferAttribute(r,u),qt.fromBufferAttribute(e,u),s[i]=i===0?0:s[i-1],s[i+1]=s[i]+Xt.distanceTo(qt);const o=new Mt(s,2,1);return t.setAttribute("instanceDistanceStart",new ke(o,1,0)),t.setAttribute("instanceDistanceEnd",new ke(o,1,1)),this}raycast(t,r){const e=this.material.worldUnits,s=t.camera;s===null&&!e&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const o=t.params.Line2!==void 0&&t.params.Line2.threshold||0;pe=t.ray;const u=this.matrixWorld,i=this.geometry,c=this.material;Pe=c.linewidth+o,i.boundingSphere===null&&i.computeBoundingSphere(),it.copy(i.boundingSphere).applyMatrix4(u);let m;if(e)m=Pe*.5;else{const h=Math.max(s.near,it.distanceToPoint(pe.origin));m=Kt(s,h,c.resolution)}if(it.radius+=m,pe.intersectsSphere(it)===!1)return;i.boundingBox===null&&i.computeBoundingBox(),ot.copy(i.boundingBox).applyMatrix4(u);let f;if(e)f=Pe*.5;else{const h=Math.max(s.near,ot.distanceToPoint(pe.origin));f=Kt(s,h,c.resolution)}ot.expandByScalar(f),pe.intersectsBox(ot)!==!1&&(e?Pr(this,r):Dr(this,s,r))}onBeforeRender(t){const r=this.material.uniforms;r&&r.resolution&&(t.getViewport(xt),this.material.uniforms.resolution.value.set(xt.z,xt.w))}}class Rr extends pn{constructor(t=new hn,r=new jt({color:Math.random()*16777215})){super(t,r),this.isLine2=!0,this.type="Line2"}}const _r=l.forwardRef(function({points:t,color:r=16777215,vertexColors:e,linewidth:s,lineWidth:o,segments:u,dashed:i,...c},m){var f,h;const y=Y(x=>x.size),M=l.useMemo(()=>u?new pn:new Rr,[u]),[L]=l.useState(()=>new jt),E=(e==null||(f=e[0])==null?void 0:f.length)===4?4:3,S=l.useMemo(()=>{const x=u?new Ot:new hn,C=t.map(d=>{const v=Array.isArray(d);return d instanceof B||d instanceof He?[d.x,d.y,d.z]:d instanceof se?[d.x,d.y,0]:v&&d.length===3?[d[0],d[1],d[2]]:v&&d.length===2?[d[0],d[1],0]:d});if(x.setPositions(C.flat()),e){r=16777215;const d=e.map(v=>v instanceof ne?v.toArray():v);x.setColors(d.flat(),E)}return x},[t,u,e,E]);return l.useLayoutEffect(()=>{M.computeLineDistances()},[t,M]),l.useLayoutEffect(()=>{i?L.defines.USE_DASH="":delete L.defines.USE_DASH,L.needsUpdate=!0},[i,L]),l.useEffect(()=>()=>{S.dispose(),L.dispose()},[S]),l.createElement("primitive",De({object:M,ref:m},c),l.createElement("primitive",{object:S,attach:"geometry"}),l.createElement("primitive",De({object:L,attach:"material",color:r,vertexColors:!!e,resolution:[y.width,y.height],linewidth:(h=s??o)!==null&&h!==void 0?h:1,dashed:i,transparent:E===4},c)))}),Or=l.forwardRef(({makeDefault:n,camera:t,regress:r,domElement:e,enableDamping:s=!0,keyEvents:o=!1,onChange:u,onStart:i,onEnd:c,...m},f)=>{const h=Y(w=>w.invalidate),y=Y(w=>w.camera),M=Y(w=>w.gl),L=Y(w=>w.events),E=Y(w=>w.setEvents),S=Y(w=>w.set),x=Y(w=>w.get),C=Y(w=>w.performance),d=t||y,v=e||L.connected||M.domElement,g=l.useMemo(()=>new Lr(d),[d]);return Ke(()=>{g.enabled&&g.update()},-1),l.useEffect(()=>(o&&g.connect(o===!0?v:o),g.connect(v),()=>{g.dispose()}),[o,v,r,g,h]),l.useEffect(()=>{const w=T=>{h(),r&&C.regress(),u&&u(T)},_=T=>{i&&i(T)},U=T=>{c&&c(T)};return g.addEventListener("change",w),g.addEventListener("start",_),g.addEventListener("end",U),()=>{g.removeEventListener("start",_),g.removeEventListener("end",U),g.removeEventListener("change",w)}},[u,i,c,g,h,E]),l.useEffect(()=>{if(n){const w=x().controls;return S({controls:g}),()=>S({controls:w})}},[n,g]),l.createElement("primitive",De({ref:f,object:g,enableDamping:s},m))}),jr=l.forwardRef(({scale:n=10,frames:t=1/0,opacity:r=1,width:e=1,height:s=1,blur:o=1,near:u=0,far:i=10,resolution:c=512,smooth:m=!0,color:f="#000000",depthWrite:h=!1,renderOrder:y,...M},L)=>{const E=l.useRef(null),S=Y(W=>W.scene),x=Y(W=>W.gl),C=l.useRef(null);e=e*(Array.isArray(n)?n[0]:n||1),s=s*(Array.isArray(n)?n[1]:n||1);const[d,v,g,w,_,U,T]=l.useMemo(()=>{const W=new Lt(c,c),z=new Lt(c,c);z.texture.generateMipmaps=W.texture.generateMipmaps=!1;const K=new Vn(e,s).rotateX(Math.PI/2),k=new on(K),G=new $n;G.depthTest=G.depthWrite=!1,G.onBeforeCompile=j=>{j.uniforms={...j.uniforms,ucolor:{value:new ne(f)}},j.fragmentShader=j.fragmentShader.replace("void main() {",`uniform vec3 ucolor;
           void main() {
          `),j.fragmentShader=j.fragmentShader.replace("vec4( vec3( 1.0 - fragCoordZ ), opacity );","vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );")};const X=new At(Tr),Z=new At(Cr);return Z.depthTest=X.depthTest=!1,[W,K,G,k,X,Z,z]},[c,e,s,n,f]),A=W=>{w.visible=!0,w.material=_,_.uniforms.tDiffuse.value=d.texture,_.uniforms.h.value=W*1/256,x.setRenderTarget(T),x.render(w,C.current),w.material=U,U.uniforms.tDiffuse.value=T.texture,U.uniforms.v.value=W*1/256,x.setRenderTarget(d),x.render(w,C.current),w.visible=!1};let D=0,H,q;return Ke(()=>{C.current&&(t===1/0||D<t)&&(D++,H=S.background,q=S.overrideMaterial,E.current.visible=!1,S.background=null,S.overrideMaterial=g,x.setRenderTarget(d),x.render(S,C.current),A(o),m&&A(o*.4),x.setRenderTarget(null),E.current.visible=!0,S.overrideMaterial=q,S.background=H)}),l.useImperativeHandle(L,()=>E.current,[]),l.createElement("group",De({"rotation-x":Math.PI/2},M,{ref:E}),l.createElement("mesh",{renderOrder:y,geometry:v,scale:[1,-1,1],rotation:[-Math.PI/2,0,0]},l.createElement("meshBasicMaterial",{transparent:!0,map:d.texture,opacity:r,depthWrite:h})),l.createElement("orthographicCamera",{ref:C,args:[-e/2,e/2,s/2,-s/2,u,i]}))});function vn({x:n,y:t}){const r=Math.abs(n),e=4.55-(r-1.45)*.78;return t>5.42?"head":t>4.45&&r<1.12?"neck":r>1.34&&Math.abs(t-e)<1.28?"arms":t<-1.18?"legs":t<.86?"pelvis":t<2.34?"waist":t<4.04&&r<1.72?"bust":"torso"}function Ur(n,t){if(!n||!t)return null;const r=new Map;for(const o of[n.a,n.b,n.c]){const u=o*3;if(!Number.isInteger(o)||u<0||u+2>=t.length)continue;const i=vn({x:t[u],y:t[u+1]});r.set(i,(r.get(i)||0)+1)}let e=null,s=0;for(const[o,u]of r)u>s&&(e=o,s=u);return e}const Ir=.08,zr=1,kr=178;function be(n,t){return Number.isFinite(n)?n:t}function ut(n){const t=n?.min,r=n?.max;if(!t||!r)return null;const e=be(t.x,Number.NaN),s=be(t.y,Number.NaN),o=be(t.z,Number.NaN),u=be(r.x,Number.NaN),i=be(r.y,Number.NaN),c=be(r.z,Number.NaN);return![e,s,o,u,i,c].every(Number.isFinite)||u<=e||i<=s||c<=o?null:{min:{x:e,y:s,z:o},max:{x:u,y:i,z:c}}}function Nr(...n){const t=n.map(ut).filter(Boolean);return t.length?t.slice(1).reduce((r,e)=>({min:{x:Math.min(r.min.x,e.min.x),y:Math.min(r.min.y,e.min.y),z:Math.min(r.min.z,e.min.z)},max:{x:Math.max(r.max.x,e.max.x),y:Math.max(r.max.y,e.max.y),z:Math.max(r.max.z,e.max.z)}}),t[0]):null}function Br(n){const t=ut(n);if(!t)return null;const r=Math.max(Math.hypot(t.min.x,t.min.z),Math.hypot(t.min.x,t.max.z),Math.hypot(t.max.x,t.min.z),Math.hypot(t.max.x,t.max.z));return{min:{x:-r,y:t.min.y,z:-r},max:{x:r,y:t.max.y,z:r}}}function Qt(n,t={}){const r=ut(n);if(!r)return null;const e=Math.max(Ir,be(t.aspect,1)),s=Math.min(kr,Math.max(zr,be(t.verticalFovDegrees,50)))*Math.PI/180,o=Math.max(1,be(t.margin,1.12)),u=(r.max.x-r.min.x)*.5,i=(r.max.y-r.min.y)*.5,c=(r.max.z-r.min.z)*.5,m={x:(r.min.x+r.max.x)*.5,y:(r.min.y+r.max.y)*.5,z:(r.min.z+r.max.z)*.5},f=Math.tan(s*.5),h=f*e,y=c+Math.max(i*o/f,u*o/h),M=Math.hypot(u,i,c);return{target:m,position:{x:m.x,y:m.y,z:m.z+y},distance:y,radius:M,near:Math.max(.01,y-M*1.35),far:Math.max(50,y+M*4)}}function Hr(n){const t=ut(n);if(!t)return null;const r=t.max.y-t.min.y,e=(t.min.x+t.max.x)*.5,s=(t.min.z+t.max.z)*.5,o=r*.145,u=r*.13,i=r*.11,c=t.max.y-o*.86;return{min:{x:e-u,y:c-o,z:s-i},max:{x:e+u,y:c+o,z:s+i}}}function Fr({send:n,onResult:t,onError:r}){let e=!1,s=!1,o=!1,u=0,i=null,c=null;const m=()=>{!e||s||o||!c||(i=c,c=null,o=!0,n(i))};return{enqueue(f){return s?null:(c={...f,requestId:++u},m(),c?.requestId||i?.requestId||u)},markReady(){e=!0,m()},resolve(f){return s||!o||f?.requestId!==i?.requestId?!1:(o=!1,i=null,c?m():f.type==="result"?t(f):r(f),!0)},fail(f){s||(o=!1,i=null,c=null,r(f))},close(){s=!0,c=null,i=null,o=!1},snapshot(){return{ready:e,closed:s,busy:o,pendingRequestId:c?.requestId||null,inFlightRequestId:i?.requestId||null}}}}const je=Object.freeze({constrainedPixels:25e5,standardPixels:4e6,constrainedMemoryGb:4,maximumDimension:4096,maximumPixelRatio:2});function Et(n,t=1){return Number.isFinite(n)&&n>0?n:t}function Wr({width:n,height:t,pixelRatio:r=1,deviceMemory:e}={}){const s=Et(n),o=Et(t),u=Number(e),i=Number.isFinite(u)&&u<=je.constrainedMemoryGb?je.constrainedPixels:je.standardPixels,c=Math.min(je.maximumPixelRatio,Et(r),je.maximumDimension/s,je.maximumDimension/o,Math.sqrt(i/(s*o)));return{width:Math.max(1,Math.floor(s*c)),height:Math.max(1,Math.floor(o*c)),maximumPixels:i}}const Ue=64,Yr=1,Gr=[77,72,80,88],Ce=3,Ct=Ce*2,Vr=Float32Array.BYTES_PER_ELEMENT,gn=Uint32Array.BYTES_PER_ELEMENT;function $r(n){if(n instanceof ArrayBuffer)return n;if(ArrayBuffer.isView(n))return n.buffer.slice(n.byteOffset,n.byteOffset+n.byteLength);throw new TypeError("MHPX data must be an ArrayBuffer or an ArrayBuffer view")}function Xr(n){if(Gr.some((t,r)=>n[r]!==t))throw new Error("Invalid MakeHuman proxy asset: expected MHPX magic")}function Ie(n,t,r){const e=n*t*gn;if(!Number.isSafeInteger(e))throw new Error(`Invalid MakeHuman proxy asset: ${r} byte length overflow`);return e}function Ne(n,t){for(let r=0;r<n.length;r+=1)if(!Number.isFinite(n[r]))throw new Error(`Invalid MakeHuman proxy asset: ${t}[${r}] is not finite`)}function Ze(n,t,r){for(let e=0;e<n.length;e+=1){const s=n[e];if(!Number.isInteger(s)||s<0||s>=t)throw new Error(`Invalid MakeHuman proxy asset: ${r}[${e}] (${s}) is outside 0..${t-1}`)}}function qr(n){const t=$r(n);if(t.byteLength<Ue)throw new Error(`Invalid MakeHuman proxy asset: expected at least ${Ue} bytes, received ${t.byteLength}`);const r=new Uint8Array(t);Xr(r);const e=new DataView(t,0,Ue),s=e.getUint32(4,!0),o=e.getUint32(8,!0),u=e.getUint32(12,!0),i=e.getUint32(16,!0),c=e.getUint32(20,!0),m=e.getUint32(60,!0);if(s!==Yr)throw new Error(`Unsupported MakeHuman proxy version ${s}`);if(c!==Ue)throw new Error(`Unsupported MakeHuman proxy header size ${c}`);if(m!==0)throw new Error(`Unsupported MakeHuman proxy flags 0x${m.toString(16)}`);if(o===0||u===0||i===0)throw new Error("Invalid MakeHuman proxy asset: vertex and index counts must be non-zero");const f=Ie(o,3,"reference"),h=Ie(o,3,"weight"),y=Ie(o,3,"offset"),M=Ie(u,1,"render source"),L=Ie(u,2,"UV"),E=Ie(i,1,"index"),S=Ue+f+h+y+M+L+E;if(!Number.isSafeInteger(S)||S!==t.byteLength)throw new Error(`Invalid MakeHuman proxy asset length: expected ${S} bytes, received ${t.byteLength}`);const x=new Uint32Array(Ct),C=new Float32Array(Ce);for(let D=0;D<Ct;D+=1)x[D]=e.getUint32(24+D*gn,!0);for(let D=0;D<Ce;D+=1){const H=e.getFloat32(48+D*Vr,!0);if(!Number.isFinite(H)||H<=0)throw new Error(`Invalid MakeHuman proxy asset: scale denominator ${D} must be positive`);C[D]=H}let d=Ue;const v=(D,H)=>{const q=new D(t,d,H).slice();return d+=q.byteLength,q},g=v(Uint32Array,o*3),w=v(Float32Array,o*3),_=v(Float32Array,o*3),U=v(Uint32Array,u),T=v(Float32Array,u*2),A=v(Uint32Array,i);return Ne(w,"weights"),Ne(_,"offsets"),Ne(T,"uvs"),Ze(U,o,"renderSources"),Ze(A,u,"indices"),{version:s,sourceCount:o,renderCount:u,indexCount:i,scaleRefs:x,scaleDenoms:C,refs:g,weights:w,offsets:_,renderSources:U,uvs:T,indices:A}}function ze(n,t,r){if(!n||n.length!==t)throw new Error(`Invalid MakeHuman proxy: ${r} must contain ${t} values`)}function Zr(n,t){if(!n||!Number.isInteger(n.sourceCount)||!Number.isInteger(n.renderCount))throw new TypeError("A parsed MakeHuman proxy is required");if(!(Array.isArray(t)||ArrayBuffer.isView(t))||!Number.isInteger(t.length)||t.length%3!==0)throw new TypeError("fitPositions must be a flat xyz position array");ze(n.scaleRefs,Ct,"scaleRefs"),ze(n.scaleDenoms,Ce,"scaleDenoms"),ze(n.refs,n.sourceCount*3,"refs"),ze(n.weights,n.sourceCount*3,"weights"),ze(n.offsets,n.sourceCount*3,"offsets"),ze(n.renderSources,n.renderCount,"renderSources");const e=t.length/3;Ze(n.scaleRefs,e,"scaleRefs"),Ze(n.refs,e,"refs"),Ze(n.renderSources,n.sourceCount,"renderSources"),Ne(n.scaleDenoms,"scaleDenoms"),Ne(n.weights,"weights"),Ne(n.offsets,"offsets");const s=new Float64Array(Ce);for(let i=0;i<Ce;i+=1){const c=n.scaleDenoms[i];if(c<=0)throw new Error(`Invalid MakeHuman proxy: scale denominator ${i} must be positive`);const m=n.scaleRefs[i*2]*3+i,f=n.scaleRefs[i*2+1]*3+i,h=Number(t[m]),y=Number(t[f]);if(!Number.isFinite(h)||!Number.isFinite(y))throw new Error(`Invalid fitPositions: scale reference for axis ${i} is not finite`);s[i]=Math.abs(y-h)/c}const o=new Float32Array(n.sourceCount*3);for(let i=0;i<n.sourceCount;i+=1){const c=i*3;for(let m=0;m<Ce;m+=1){let f=0;for(let h=0;h<3;h+=1){const y=n.refs[c+h]*3+m,M=Number(t[y]);if(!Number.isFinite(M))throw new Error(`Invalid fitPositions: referenced coordinate for source ${i} is not finite`);f+=M*n.weights[c+h]}o[c+m]=f+n.offsets[c+m]*s[m]}}const u=new Float32Array(n.renderCount*3);for(let i=0;i<n.renderCount;i+=1){const c=n.renderSources[i]*3,m=i*3;u[m]=o[c],u[m+1]=o[c+1],u[m+2]=o[c+2]}return u}class Je extends Xn{parse(t){return qr(t)}load(t,r,e,s){const o=new qn(this.manager);return o.setPath(this.path),o.setResponseType("arraybuffer"),o.setRequestHeader(this.requestHeader),o.setWithCredentials(this.withCredentials),o.load(t,u=>{try{r?.(this.parse(u))}catch(i){s?s(i):console.error(i),this.manager.itemError(t)}},e,s)}}const Be=()=>null,yn=new ne("#ffffff");class at extends l.Component{state={failed:!1,retries:0};static getDerivedStateFromError(){return{failed:!0}}componentDidCatch(){this.state.retries>0||(this.retryTimer=window.setTimeout(()=>{try{this.props.onRetry?.()}finally{this.setState(t=>({failed:!1,retries:t.retries+1}))}},650))}componentDidUpdate(t){t.resetKey!==this.props.resetKey&&(this.state.failed||this.state.retries>0)&&(window.clearTimeout(this.retryTimer),this.setState({failed:!1,retries:0}))}componentWillUnmount(){window.clearTimeout(this.retryTimer)}render(){return this.state.failed?null:this.props.children}}function ct(n,t){n&&Le.clear(Je,n),t&&Le.clear(an,t)}function dt(n,t){const r=l.useMemo(()=>Zr(n,t),[t,n]),e=l.useMemo(()=>{const s=new Dt;return s.setAttribute("position",new Ae(new Float32Array(n.renderCount*3),3)),s.setAttribute("uv",new Ae(n.uvs.slice(),2)),s.setIndex(new Ae(n.indices,1)),s.computeVertexNormals(),s.computeBoundingSphere(),s},[n]);return l.useLayoutEffect(()=>{const s=e.getAttribute("position");s.array.set(r),s.needsUpdate=!0,e.computeVertexNormals(),e.computeBoundingSphere()},[e,r]),l.useEffect(()=>()=>e.dispose(),[e]),e}function Ut(n){const t=Le(an,n);return l.useLayoutEffect(()=>{t.colorSpace=cn,t.anisotropy=4,t.needsUpdate=!0},[t]),t}function Kr(n,t=.62){return new ne(n).lerp(yn,t)}function Qr({asset:n,fitPositions:t,color:r}){const e=Le(Je,n.proxy),s=Ut(n.texture),o=dt(e,t),u=l.useMemo(()=>new ne(r),[r]);return p.jsx("mesh",{geometry:o,castShadow:!0,receiveShadow:!0,raycast:Be,renderOrder:2,children:p.jsx("meshPhysicalMaterial",{map:s,color:u,side:lt,roughness:.56,metalness:0,clearcoat:.08,clearcoatRoughness:.72,alphaTest:.13,alphaToCoverage:!0})})}function Jr({fitPositions:n,skinColor:t,surfaceMode:r}){const e=Le(Je,he.eyes),s=dt(e,n),o=l.useMemo(()=>r==="studio"?new ne(t).lerp(yn,.5):r==="clay"?new ne("#c3b9b2"):new ne("#a99da1"),[t,r]);return p.jsx("mesh",{geometry:s,raycast:Be,renderOrder:3,children:p.jsx("meshStandardMaterial",{color:o,roughness:.5,metalness:0})})}function es({faceAnchor:n}){const t=l.useMemo(()=>new Zn(1,18,12),[]),r=l.useMemo(()=>new Kn({color:"#080a09",toneMapped:!1}),[]);if(l.useEffect(()=>()=>{t.dispose(),r.dispose()},[t,r]),!n||!Number.isFinite(n.y)||!Number.isFinite(n.eyeX)||!Number.isFinite(n.frontZ))return null;const e=ve.clamp(n.eyeX*.105,.03,.045),s=n.frontZ+n.eyeX*.48,o=[e,e,e*.32];return p.jsxs("group",{children:[p.jsx("mesh",{geometry:t,material:r,position:[-n.eyeX,n.y,s],scale:o,raycast:Be,renderOrder:4}),p.jsx("mesh",{geometry:t,material:r,position:[n.eyeX,n.y,s],scale:o,raycast:Be,renderOrder:4})]})}function ts({fitPositions:n,color:t}){const r=Le(Je,he.brows),e=Ut(he.browTexture),s=dt(r,n),o=l.useMemo(()=>Kr(t,.46),[t]);return p.jsx("mesh",{geometry:s,raycast:Be,renderOrder:4,children:p.jsx("meshStandardMaterial",{map:e,color:o,side:lt,roughness:.78,alphaTest:.18,alphaToCoverage:!0})})}function ns({fitPositions:n,intensity:t}){const r=Le(Je,he.lashes),e=Ut(he.lashTexture),s=dt(r,n),o=ve.clamp(Number(t)||0,0,100)/100,u=l.useMemo(()=>new ne("#756a6c").lerp(new ne("#160f12"),o),[o]);return p.jsx("mesh",{geometry:s,raycast:Be,renderOrder:5,children:p.jsx("meshStandardMaterial",{map:e,color:u,side:lt,roughness:.7,alphaTest:.12,alphaToCoverage:!0})})}function rs({fitPositions:n,faceAnchor:t,skinColor:r=$e.skinColor,hairStyle:e=$e.hairStyle,hairColor:s=$e.hairColor,browColor:o=$e.browColor,lashIntensity:u=$e.lashIntensity,surfaceMode:i="studio"}){const c=l.useDeferredValue(e),m=An[c];if(!((Array.isArray(n)||ArrayBuffer.isView(n))&&n.length===Ln*3))return null;const h=i==="studio";return p.jsxs(p.Fragment,{children:[p.jsx(at,{resetKey:"eyes-neutral",onRetry:()=>ct(he.eyes),children:p.jsx(l.Suspense,{fallback:null,children:p.jsx(Jr,{fitPositions:n,skinColor:r,surfaceMode:i})})}),p.jsx(es,{faceAnchor:t}),h&&p.jsxs(p.Fragment,{children:[p.jsx(at,{resetKey:"brows",onRetry:()=>ct(he.brows,he.browTexture),children:p.jsx(l.Suspense,{fallback:null,children:p.jsx(ts,{fitPositions:n,color:o})})}),p.jsx(at,{resetKey:"lashes",onRetry:()=>ct(he.lashes,he.lashTexture),children:p.jsx(l.Suspense,{fallback:null,children:p.jsx(ns,{fitPositions:n,intensity:u})})}),m&&p.jsx(at,{resetKey:c,onRetry:()=>ct(m.proxy,m.texture),children:p.jsx(l.Suspense,{fallback:null,children:p.jsx(Qr,{asset:m,fitPositions:n,color:s})})})]})]})}const ss=l.memo(rs),os="#c9ad96",is="#303834",Jt=new ne("#c9ccc6"),as=new ne("#b86448"),cs=()=>null,ls={head:"#bca696",neck:"#a78f83",bust:"#c45f78",torso:"#d18470",waist:"#d5a36e",pelvis:"#9573a0",legs:"#6f8ba8",arms:"#62a0a0"},en={front:0,threeQuarter:-Math.PI*.24,side:-Math.PI/2,back:Math.PI};function us(){const[n,t]=l.useState(()=>typeof window<"u"&&window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);return l.useEffect(()=>{const r=window.matchMedia?.("(prefers-reduced-motion: reduce)");if(!r)return;const e=()=>t(r.matches);return r.addEventListener?.("change",e),()=>r.removeEventListener?.("change",e)},[]),n}function ds(n,t){return t==="all"||t==="pose"?t==="all":t==="appearance"?!1:t==="torso"?n==="torso"||n==="waist":t==="head"?n==="head"||n==="neck":t==="pelvis"||t==="hips"?n==="pelvis":n===t}function fs(n,t,r,e){const s=new Float32Array(n.length),o=new ne(t?.skinColor),u=new ne(t?.suitColor),i=new ne,c=r!=="all"&&r!=="appearance"&&r!=="pose";for(let m=0;m<n.length;m+=3){const f=Math.abs(n[m]),h=n[m+1],y=vn({x:n[m],y:h}),M=h>-1.72&&h<4.48&&f<1.75,L=h>-2.68&&h<=-1.72&&f<.8+(h+2.68)*.82,E=ds(y,r);e==="atlas"?i.set(ls[y]||"#b6aaa3"):e==="clay"||e==="contour"?i.copy(Jt):i.copy(M||L?u:o),c&&E?i.lerp(as,e==="atlas"?.38:.24):e==="atlas"&&c&&i.lerp(Jt,.36),s[m]=i.r,s[m+1]=i.g,s[m+2]=i.b}return s}function ms({assets:n,morphed:t,appearance:r,selectedPart:e,surfaceMode:s,onSelectPart:o}){const u=r?.skinColor||os,i=r?.suitColor||is,c=l.useMemo(()=>{const f=new Dt;return f.setAttribute("position",new Ae(n.positions.slice(),3)),f.setAttribute("color",new Ae(new Float32Array(n.positions.length),3)),f.setIndex(new Ae(n.indices,1)),f.computeVertexNormals(),f.computeBoundingSphere(),f},[n]);l.useLayoutEffect(()=>{const f=c.getAttribute("position");f.array.set(t.positions),f.needsUpdate=!0,c.computeVertexNormals(),c.computeBoundingSphere()},[c,t]),l.useLayoutEffect(()=>{const f=c.getAttribute("color");f.array.set(fs(n.positions,{skinColor:u,suitColor:i},e,s)),f.needsUpdate=!0},[n.positions,c,e,u,i,s]),l.useEffect(()=>()=>c.dispose(),[c]);const m=f=>{if(f.stopPropagation(),!o)return;const h=Ur(f.face,n.positions);h&&o(h)};return p.jsxs(p.Fragment,{children:[p.jsx("mesh",{geometry:c,castShadow:!0,receiveShadow:!0,onClick:m,children:p.jsx("meshPhysicalMaterial",{vertexColors:!0,roughness:s==="studio"?.68:.82,metalness:0,clearcoat:s==="studio"?.045:0,clearcoatRoughness:.72})}),s==="contour"&&p.jsx("mesh",{geometry:c,renderOrder:3,children:p.jsx("meshBasicMaterial",{color:"#313a35",wireframe:!0,transparent:!0,opacity:.24,depthWrite:!1})})]})}function hs({assets:n,morphed:t}){const r=l.useMemo(()=>{const e=new Dt;return e.setAttribute("position",new Ae(t.positions.slice(),3)),e.setIndex(new Ae(n.indices,1)),e.computeBoundingSphere(),e},[n.indices,t.positions]);return l.useEffect(()=>()=>r.dispose(),[r]),p.jsx("mesh",{geometry:r,renderOrder:0,children:p.jsx("meshBasicMaterial",{color:"#367f77",wireframe:!0,transparent:!0,opacity:.28,depthWrite:!1})})}function ps(n,t){return n+Math.atan2(Math.sin(t-n),Math.cos(t-n))}function tn(n,t,r){let e=1/0,s=1/0,o=1/0,u=-1/0,i=-1/0,c=-1/0;for(let m=0;m<n.length;m+=3){const f=n[m]*t,h=n[m+1]*t+r,y=n[m+2]*t;e=Math.min(e,f),s=Math.min(s,h),o=Math.min(o,y),u=Math.max(u,f),i=Math.max(i,h),c=Math.max(c,y)}return{min:{x:e,y:s,z:o},max:{x:u,y:i,z:c}}}function nn(n){return n instanceof Element?n.closest("input, textarea, select, button")?!0:!!n.closest('[contenteditable]:not([contenteditable="false"])'):!1}function rn(n,t){return Number.isFinite(n)?t==="imperial"?`${(n/2.54).toFixed(1)} in`:`${n.toFixed(1)} cm`:"—"}function vs(n,t){if(!Number.isFinite(n))return"—";const r=t==="imperial"?n/2.54:n,e=t==="imperial"?"in":"cm";return`${r>=0?"+":""}${r.toFixed(1)} ${e}`}function gs(n){return n?.status==="within-tolerance"?"within tolerance":n?.calibrationStatus==="authored-limit"?"authored limit":n?.calibrationStatus==="calibration-miss"?"calibration gap":n?.status==="outside-tolerance"?"outside tolerance":"unmeasurable"}function ys(n){if(!Array.isArray(n)||n.length===0)return null;let t=n[0];for(const r of n)r[0]>t[0]&&(t=r);return[t[0]+.17,t[1],t[2]]}function xs(n,t,r,e,s,o){const u=s-r,i=o-e,c=u*u+i*i;if(c<=Number.EPSILON)return(n-r)**2+(t-e)**2;const m=ve.clamp(((n-r)*u+(t-e)*i)/c,0,1),f=r+u*m,h=e+i*m;return(n-f)**2+(t-h)**2}function bs(n,t,r,e,s,o){if(!t||!Array.isArray(n)||n.length<2)return 1/0;t.updateWorldMatrix(!0,!1);const u=new B;let i=null,c=1/0;for(const m of n){u.set(m[0],m[1],m[2]).applyMatrix4(t.matrixWorld).project(r);const f={x:(u.x+1)*e.width*.5,y:(1-u.y)*e.height*.5,visible:u.z>=-1&&u.z<=1};i?.visible&&f.visible&&(c=Math.min(c,xs(s,o,i.x,i.y,f.x,f.y))),i=f}return c}function ws({points:n,onHoverStart:t,onHoverEnd:r}){const e=l.useMemo(()=>{const s=n.map(i=>new B(...i));if(s.length>2&&s[0].distanceToSquared(s.at(-1))<1e-6&&s.pop(),s.length<3)return null;const o=new er(s,!0,"centripetal"),u=Math.max(48,Math.min(192,s.length*2));return new tr(o,u,.12,8,!0)},[n]);return l.useEffect(()=>()=>e?.dispose(),[e]),e?p.jsx("mesh",{geometry:e,renderOrder:7,onPointerOver:s=>{s.stopPropagation(),t()},onPointerOut:r,children:p.jsx("meshBasicMaterial",{transparent:!0,opacity:0,depthWrite:!1,colorWrite:!1})}):null}function Es({anthropometry:n,selectedPart:t,selectedBand:r,unit:e,onSelectBand:s}){const[o,u]=l.useState(null),i=Y(E=>E.gl),c=Y(E=>E.camera),m=l.useRef(null),f=l.useRef(null),h=l.useRef({key:null,at:0});yr(!!o,"pointer","auto");const y=l.useCallback(E=>{const S=yt.find(C=>C.key===E);if(!S)return;const x=performance.now();h.current.key===E&&x-h.current.at<120||(h.current={key:E,at:x},s?.(S.part,S.key))},[s]);l.useEffect(()=>{const E=i.domElement;let S=!1;const x=g=>{(g.code==="Space"||g.key===" ")&&(S=!0)},C=g=>{(g.code==="Space"||g.key===" ")&&(S=!1)},d=g=>{if(g.button!==0||S||E.dataset.spacePanning==="true"||!m.current)return;if(f.current){y(f.current);return}const w=E.getBoundingClientRect(),_=g.clientX-w.left,U=g.clientY-w.top;if(_<0||U<0||_>w.width||U>w.height)return;let T=null,A=22**2;for(const D of yt){const H=bs(n?.ribbons?.[D.key],m.current,c,w,_,U);H<=A&&(A=H,T=D.key)}T&&y(T)},v=()=>{S=!1};return E.addEventListener("keydown",x),E.addEventListener("keyup",C),window.addEventListener("pointerdown",d,!0),window.addEventListener("keydown",x,!0),window.addEventListener("keyup",C),window.addEventListener("blur",v),()=>{E.removeEventListener("keydown",x),E.removeEventListener("keyup",C),window.removeEventListener("pointerdown",d,!0),window.removeEventListener("keydown",x,!0),window.removeEventListener("keyup",C),window.removeEventListener("blur",v)}},[n,c,i,y]);const L=r||(t==="bust"?"bust":t==="waist"||t==="torso"?"waist":t==="pelvis"||t==="hips"?"hips":t==="legs"?"thigh":t==="neck"||t==="head"?"neck":null);return p.jsx("group",{ref:m,children:yt.map(E=>{const S=n?.ribbons?.[E.key],x=n?.results?.[E.key];if(!Array.isArray(S)||S.length<2||!x)return null;const C=L===E.key,d=o===E.key,v=ys(S),g=()=>{f.current=E.key,u(E.key)},w=()=>{f.current===E.key&&(f.current=null),u(_=>_===E.key?null:_)};return p.jsxs("group",{children:[p.jsx(_r,{points:S,color:C?"#72e4e3":d?"#d7ffff":"#96c3c5",lineWidth:C?2.4:d?1.7:.85,transparent:!0,opacity:C?.98:d?.78:.28,depthTest:!1,renderOrder:5,raycast:cs}),p.jsx(ws,{points:S,onHoverStart:g,onHoverEnd:w}),(C||d)&&v&&p.jsx(_t,{position:v,center:!0,distanceFactor:9,zIndexRange:[12,0],pointerEvents:"none",wrapperClass:"body-band-label-host",style:{pointerEvents:"none"},children:p.jsxs("div",{className:`body-band-label${d&&!C?" hover":""}`,children:[p.jsx("span",{children:E.label}),p.jsx("strong",{children:rn(x.valueCm,e)}),p.jsxs("small",{children:["Target ",rn(x.targetCm,e)," · Δ ",vs(x.residualCm,e)," · ",gs(x)]})]})})]},E.key)})})}function Ss({assets:n,morphed:t,comparisonMorphed:r,resolvedMeasurements:e,resolvedComparisonMeasurements:s,morphPending:o,pose:u,autoRotate:i,appearance:c,selectedPart:m,selectedBand:f,surfaceMode:h,showMeasurements:y,compareEnabled:M,cameraView:L,resetViewKey:E,unit:S,onSelectPart:x,onSelectBand:C,onBoundsChange:d,onAnthropometryChange:v}){const g=l.useRef(),w=l.useRef(0),_=l.useRef((en[L]||0)+ve.degToRad(u.turn)),U=l.useRef({autoRotate:i,cameraView:L,turn:u.turn,resetViewKey:E}),T=l.useRef(v),A=us(),D=Y(j=>j.invalidate),H=l.useMemo(()=>({active:t.anthropometry,reference:r?.anthropometry||null}),[r,t.anthropometry]),W=e.height/30.2/(t.maxY-t.minY),z=-t.minY*W+.055,K=r?s.height/30.2/(r.maxY-r.minY):W,k=r?-r.minY*K+.055:z,G=l.useMemo(()=>{const j=tn(t.positions,W,z),V=M&&r?tn(r.positions,K,k):null;return Br(Nr(j,V))},[M,k,r,K,z,W,t.positions]),X=l.useCallback((j,V)=>{w.current=performance.now()+1500,C?.(j,V)},[C]),Z=l.useCallback(j=>{performance.now()<w.current||x?.(j)},[x]);return l.useLayoutEffect(()=>{d?.(G)},[G,d]),l.useLayoutEffect(()=>{T.current=v},[v]),l.useEffect(()=>{T.current?.(H)},[H]),l.useEffect(()=>{const j=U.current,V=g.current?.rotation.y||0,F=(en[L]||0)+ve.degToRad(u.turn),re=j.cameraView!==L||j.turn!==u.turn||j.resetViewKey!==E;i||(_.current=j.autoRotate&&!re?V:ps(V,F)),U.current={autoRotate:i,cameraView:L,turn:u.turn,resetViewKey:E},D()},[i,L,D,u.turn,E]),l.useEffect(()=>{D()},[c,i,L,r,D,t,o,u.turn,A,E,f,m,y,h,S]),Ke((j,V)=>{if(g.current)if(i&&!A)g.current.rotation.y+=V*.3,D();else{const F=_.current;g.current.rotation.y=ve.damp(g.current.rotation.y,F,7,V),Math.abs(g.current.rotation.y-F)>1e-4&&D()}}),p.jsxs("group",{ref:g,children:[M&&r&&p.jsx("group",{position:[0,k,0],scale:K,children:p.jsx(hs,{assets:n,morphed:r})}),p.jsxs("group",{position:[0,z,0],scale:W,children:[p.jsx(ms,{assets:n,morphed:t,appearance:c,selectedPart:m,surfaceMode:h,onSelectPart:Z}),p.jsx(ss,{fitPositions:t.fitPositions,faceAnchor:t.faceAnchor,hairStyle:c?.hairStyle,hairColor:c?.hairColor,skinColor:c?.skinColor,browColor:c?.browColor,lashIntensity:c?.lashIntensity,surfaceMode:h}),y&&!o&&p.jsx(Es,{anthropometry:t.anthropometry,selectedPart:m,selectedBand:f,unit:S,onSelectBand:X})]}),o&&p.jsx(_t,{position:[0,G.max.y+.18,0],center:!0,distanceFactor:10,zIndexRange:[10,0],children:p.jsx("div",{className:"canvas-evaluating",role:"status",children:"Updating surface tapeâ€¦"})})]})}function xn(){return p.jsx(_t,{position:[0,2.8,0],center:!0,distanceFactor:9,zIndexRange:[20,0],children:p.jsxs("div",{className:"canvas-loader",role:"status","aria-live":"polite",children:[p.jsx("span",{className:"canvas-loader-scan","aria-hidden":"true",children:p.jsx("i",{})}),p.jsx("strong",{children:"Building the human mesh"}),p.jsx("small",{children:"Decoding anatomy and fitted assets"})]})})}function Ms({measurements:n,comparisonMeasurements:t,pose:r,compareEnabled:e}){const[s,o]=l.useState({active:null,reference:null,measurements:null,comparisonMeasurements:null,pending:!0,error:null}),u=l.useRef(null),i=l.useMemo(()=>({arms:r.arms,stance:r.stance}),[r.arms,r.stance]);return l.useEffect(()=>{const c=new Worker(new URL("/assets/mpfbMorph.worker-Cu_AkrP_.js",import.meta.url),{type:"module",name:"form-atlas-morph"}),m=Fr({send:y=>c.postMessage({type:"morph",...y}),onResult:y=>{o({active:y.active,reference:y.reference,measurements:y.measurements,comparisonMeasurements:y.comparisonMeasurements,pending:!1,error:null})},onError:y=>{const M=y instanceof Error?y:new Error(y?.error||"The anatomy worker stopped unexpectedly");o(L=>({...L,pending:!1,error:M}))}});u.current=m;const f=y=>{y.data?.type==="ready"?m.markReady():y.data?.type==="fatal"?m.fail(new Error(y.data.error)):m.resolve(y.data)},h=y=>{y.preventDefault?.(),m.fail(new Error(y.message||"The anatomy worker stopped unexpectedly"))};return c.addEventListener("message",f),c.addEventListener("error",h),c.postMessage({type:"initialize",manifestUrl:ln}),()=>{m.close(),u.current=null,c.removeEventListener("message",f),c.removeEventListener("error",h),c.terminate()}},[]),l.useEffect(()=>{o(c=>({...c,pending:!0,error:null})),u.current?.enqueue({measurements:n,comparisonMeasurements:t,pose:i,compareEnabled:e})},[e,t,n,i]),s}function As({focusMode:n,modelBounds:t,resetViewKey:r,fitBodyViewKey:e=0,onNavigate:s}){const o=l.useRef(),u=Y(d=>d.camera),i=Y(d=>d.gl),c=Y(d=>d.invalidate),m=Y(d=>d.size),f=l.useRef(null),h=l.useRef(null),y=l.useRef(!1),M=l.useRef(!1),L=l.useRef("body"),E=l.useRef({focusMode:n,resetViewKey:r,fitBodyViewKey:e,width:0,height:0,modelBounds:null}),S=l.useMemo(()=>({LEFT:ce.ROTATE,MIDDLE:ce.DOLLY,RIGHT:ce.PAN}),[]),x=l.useMemo(()=>Qt(t,{aspect:m.width/Math.max(1,m.height),verticalFovDegrees:u.fov,margin:1.13}),[u.fov,t,m.height,m.width]),C=l.useCallback(d=>{if(!o.current||!t){h.current=d;return}const v=d==="face"?Hr(t):t,g=Qt(v,{aspect:m.width/Math.max(1,m.height),verticalFovDegrees:u.fov,margin:d==="face"?1.16:1.13});if(!g)return;const w=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;f.current={elapsed:0,duration:w?.01:.58,fromPosition:u.position.clone(),fromTarget:o.current.target.clone(),toPosition:new B(g.position.x,g.position.y,g.position.z),toTarget:new B(g.target.x,g.target.y,g.target.z)},u.near=.05,u.far=Math.max(100,g.far),u.updateProjectionMatrix(),h.current=null,y.current=!0,M.current=!1,L.current=d,c()},[u,c,t,m.height,m.width]);return l.useEffect(()=>{const d=E.current,v=d.fitBodyViewKey!==e,g=d.resetViewKey!==r,w=d.focusMode!==n,_=d.width!==m.width||d.height!==m.height,U=d.modelBounds!==t;let T=h.current;v?T="body":y.current?w?T=n==="face"?"face":"body":(g||(_||U)&&!M.current)&&(T=L.current):T=n==="face"?"face":"body",E.current={focusMode:n,resetViewKey:r,fitBodyViewKey:e,width:m.width,height:m.height,modelBounds:t},T&&C(T)},[e,n,t,r,m.height,m.width,C]),l.useEffect(()=>{const d=i.domElement,v={pointerInside:!1,spaceHeld:!1,spaceGesture:!1,suppressClick:!1,suppressTimer:0,previousCursor:d.style.cursor},g=d.getAttribute("tabindex"),w=d.getAttribute("aria-label"),_=d.getAttribute("aria-describedby"),U=d.getAttribute("aria-keyshortcuts"),T=d.dataset.spacePanning;d.tabIndex=0,d.setAttribute("aria-label","Interactive 3D body preview"),d.setAttribute("aria-describedby","viewport-navigation-help"),d.setAttribute("aria-keyshortcuts","Space ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight PageUp PageDown");const A=O=>{S.LEFT=O,o.current&&(o.current.mouseButtons.LEFT=O)},D=()=>{v.spaceHeld&&(v.spaceHeld=!1,delete d.dataset.spacePanning,A(ce.ROTATE),d.style.cursor=v.spaceGesture?"grabbing":v.previousCursor,c())},H=(O=!0)=>{v.spaceHeld=!1,v.spaceGesture=!1,delete d.dataset.spacePanning,v.suppressClick=!1,window.clearTimeout(v.suppressTimer),v.suppressTimer=0,A(ce.ROTATE),d.style.cursor=v.previousCursor,O&&c()},q=()=>{v.spaceGesture&&(v.spaceGesture=!1,d.style.cursor=v.spaceHeld?"grab":v.previousCursor,window.clearTimeout(v.suppressTimer),v.suppressTimer=window.setTimeout(()=>{v.suppressClick=!1},0))},W=()=>{v.pointerInside=!0},z=()=>{v.pointerInside=!1,v.spaceGesture?D():H()},K=O=>{O.button===0&&(d.focus({preventScroll:!0}),v.spaceHeld&&(v.spaceGesture=!0,v.suppressClick=!0,d.style.cursor="grabbing"))},k=()=>q(),G=()=>H(),X=O=>{v.suppressClick&&(O.preventDefault(),O.stopImmediatePropagation(),v.suppressClick=!1,window.clearTimeout(v.suppressTimer))},Z=O=>{O.code!=="Space"&&O.key!==" "||nn(O.target)||!(v.pointerInside||document.activeElement===d||v.spaceGesture)||(O.preventDefault(),!v.spaceHeld&&(v.spaceHeld=!0,d.dataset.spacePanning="true",A(ce.PAN),d.style.cursor="grab",c()))},j=O=>{O.code!=="Space"&&O.key!==" "||(v.spaceHeld&&O.preventDefault(),D())},V=O=>{if(!o.current||nn(O.target))return;const we=O.shiftKey&&["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(O.key),Re=O.key==="PageUp"||O.key==="PageDown";if(!we&&!Re)return;O.preventDefault(),O.stopImmediatePropagation(),f.current=null,M.current=!0,s?.();const oe=o.current.target,le=u.position.clone().sub(oe);if(Re){const $=le.length(),I=O.key==="PageUp"?.88:1/.88,ie=ve.clamp($*I,o.current.minDistance,o.current.maxDistance);le.setLength(ie)}else{const $=new St().setFromVector3(le),I=ve.degToRad(7.5);O.key==="ArrowLeft"&&($.theta-=I),O.key==="ArrowRight"&&($.theta+=I),O.key==="ArrowUp"&&($.phi-=I),O.key==="ArrowDown"&&($.phi+=I),$.phi=ve.clamp($.phi,o.current.minPolarAngle,o.current.maxPolarAngle),le.setFromSpherical($)}u.position.copy(oe).add(le),u.lookAt(oe),o.current.update(),c()},F=()=>{document.visibilityState!=="visible"&&H()},re=()=>H();return d.addEventListener("pointerenter",W),d.addEventListener("pointerleave",z),d.addEventListener("pointerdown",K,!0),d.addEventListener("pointerup",k),d.addEventListener("pointercancel",G),d.addEventListener("click",X,!0),d.addEventListener("keydown",V,!0),window.addEventListener("pointerup",k),window.addEventListener("pointercancel",G),window.addEventListener("keydown",Z,{passive:!1}),window.addEventListener("keyup",j,{passive:!1}),window.addEventListener("blur",re),document.addEventListener("visibilitychange",F),()=>{H(!1),g===null?d.removeAttribute("tabindex"):d.setAttribute("tabindex",g),w===null?d.removeAttribute("aria-label"):d.setAttribute("aria-label",w),_===null?d.removeAttribute("aria-describedby"):d.setAttribute("aria-describedby",_),U===null?d.removeAttribute("aria-keyshortcuts"):d.setAttribute("aria-keyshortcuts",U),T===void 0?delete d.dataset.spacePanning:d.dataset.spacePanning=T,d.removeEventListener("pointerenter",W),d.removeEventListener("pointerleave",z),d.removeEventListener("pointerdown",K,!0),d.removeEventListener("pointerup",k),d.removeEventListener("pointercancel",G),d.removeEventListener("click",X,!0),d.removeEventListener("keydown",V,!0),window.removeEventListener("pointerup",k),window.removeEventListener("pointercancel",G),window.removeEventListener("keydown",Z),window.removeEventListener("keyup",j),window.removeEventListener("blur",re),document.removeEventListener("visibilitychange",F)}},[u,i,c,S,s]),Ke((d,v)=>{const g=f.current;if(!g||!o.current)return;g.elapsed+=v;const w=Math.min(1,g.elapsed/g.duration),_=1-(1-w)**3;u.position.lerpVectors(g.fromPosition,g.toPosition,_),o.current.target.lerpVectors(g.fromTarget,g.toTarget,_),o.current.update(),w>=1?f.current=null:c()}),p.jsx(Or,{ref:o,makeDefault:!0,enableDamping:!0,dampingFactor:.08,enablePan:!0,screenSpacePanning:!0,panSpeed:.58,keyPanSpeed:16,keyEvents:i.domElement,zoomToCursor:!0,mouseButtons:S,touches:{ONE:Me.ROTATE,TWO:Me.DOLLY_PAN},cursor:x?[x.target.x,x.target.y,x.target.z]:[0,3,0],minTargetRadius:0,maxTargetRadius:x?Math.max(1,x.radius*1.2):4,minDistance:n==="face"?1.8:2.5,maxDistance:x?Math.max(14,x.distance*2.25):24,minPolarAngle:Math.PI*.3,maxPolarAngle:Math.PI*.68,onStart:()=>{f.current=null,M.current=!0,s?.()},onChange:()=>c(),onEnd:()=>c()})}function Ls({onLost:n,onRestored:t}){const r=Y(s=>s.gl),e=Y(s=>s.invalidate);return l.useEffect(()=>{const s=r.domElement,o=i=>{i.preventDefault(),n?.()},u=()=>{t?.(),e()};return s.addEventListener("webglcontextlost",o),s.addEventListener("webglcontextrestored",u),()=>{s.removeEventListener("webglcontextlost",o),s.removeEventListener("webglcontextrestored",u)}},[r,e,n,t]),null}function Ts({requestKey:n=0,onCaptured:t}){const r=Y(m=>m.gl),e=Y(m=>m.scene),s=Y(m=>m.camera),o=Y(m=>m.size),u=Y(m=>m.invalidate),i=l.useRef(0),c=l.useRef(t);return l.useLayoutEffect(()=>{c.current=t},[t]),l.useEffect(()=>{if(!n||n===i.current)return;i.current=n;let m=null;const f=r.getRenderTarget(),h=r.xr.enabled,y=e.background;try{const{width:M,height:L}=Wr({width:o.width,height:o.height,pixelRatio:r.getPixelRatio(),deviceMemory:globalThis.navigator?.deviceMemory});m=new Lt(M,L,{depthBuffer:!0,stencilBuffer:!1,type:Qn}),m.texture.colorSpace=cn,r.xr.enabled=!1,e.background=new ne("#b8c0ba"),r.setRenderTarget(m),r.clear(!0,!0,!0),r.render(e,s);const E=new Uint8Array(M*L*4);r.readRenderTargetPixels(m,0,0,M,L,E),r.setRenderTarget(f),r.xr.enabled=h,e.background=y,u();const S=document.createElement("canvas");S.width=M,S.height=L;const x=S.getContext("2d");if(!x)throw new Error("Image canvas is unavailable");const C=M*4,d=new Uint8Array(C);for(let g=0;g<Math.floor(L/2);g+=1){const w=g*C,_=(L-1-g)*C;d.set(E.subarray(w,w+C)),E.copyWithin(w,_,_+C),E.set(d,_)}const v=new ImageData(new Uint8ClampedArray(E.buffer),M,L);x.putImageData(v,0,0),S.toBlob(g=>{g?c.current?.({blob:g,width:M,height:L}):c.current?.({error:new Error("Image encoding failed")})},"image/png")}catch(M){c.current?.({error:M})}finally{r.setRenderTarget(f),r.xr.enabled=h,e.background=y,m?.dispose()}},[s,r,u,n,e,o.height,o.width]),null}function Cs(n){const t=Le(Jn,ln),r=Ms(n);if(r.error)throw r.error;return!r.active||!r.measurements?p.jsx(xn,{}):p.jsx(Ss,{...n,assets:t,morphed:r.active,comparisonMorphed:r.reference,resolvedMeasurements:r.measurements,resolvedComparisonMeasurements:r.comparisonMeasurements,morphPending:r.pending})}function Ps(n){const[t,r]=l.useState(null),e=l.useCallback(s=>{r(o=>o&&o.min.x===s.min.x&&o.min.y===s.min.y&&o.min.z===s.min.z&&o.max.x===s.max.x&&o.max.y===s.max.y&&o.max.z===s.max.z?o:s)},[]);return p.jsxs(p.Fragment,{children:[p.jsx("ambientLight",{intensity:1.12}),p.jsx("hemisphereLight",{args:["#fffdf7","#46504a",.8]}),p.jsx("directionalLight",{position:[4.8,8,6],intensity:2.25,castShadow:!0,"shadow-mapSize":[1024,1024]}),p.jsx("directionalLight",{position:[-4,3.5,4],intensity:.76,color:"#ead8c6"}),p.jsx(l.Suspense,{fallback:p.jsx(xn,{}),children:p.jsx(Cs,{...n,onBoundsChange:e})}),p.jsx(jr,{position:[0,.035,0],opacity:.2,scale:7,blur:2.7,far:5,resolution:256}),p.jsx(Ts,{requestKey:n.captureRequestKey,onCaptured:n.onCaptureResult}),p.jsx(As,{focusMode:n.focusMode,modelBounds:t,resetViewKey:n.resetViewKey,fitBodyViewKey:n.fitBodyViewKey,onNavigate:n.onNavigate})]})}function Ds(n){const[t,r]=l.useState(!1),e=l.useCallback(()=>r(!0),[]),s=l.useCallback(()=>r(!1),[]);return p.jsxs(p.Fragment,{children:[p.jsxs(cr,{shadows:!0,frameloop:"demand",dpr:[1,1.65],camera:{position:[0,2.9,10.2],fov:34,near:.1,far:50},gl:{antialias:!0,alpha:!0,preserveDrawingBuffer:!1,powerPreference:"high-performance"},"aria-label":"Interactive female surface-anatomy model with selectable body regions and measurement bands.",children:[p.jsx(Ls,{onLost:e,onRestored:s}),p.jsx(Ps,{...n})]}),t&&p.jsxs("div",{className:"scene-state scene-error",role:"status","aria-live":"polite",children:[p.jsx("span",{className:"scene-state-mark",children:"!"}),p.jsx("strong",{children:"Restoring the 3D preview"}),p.jsx("p",{children:"The graphics context paused. Your profile is safe while the browser reconnects it."})]})]})}const Us=l.memo(Ds);export{Us as default};
