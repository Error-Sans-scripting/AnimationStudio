(() => {
const $=id=>document.getElementById(id), canvas=$('canvas'), ctx=canvas.getContext('2d');
let W=1280,H=720, fps=12, bg='#ffffff', currentTool='select', currentLayer=0, currentFrame=0, onion=false, playing=false, playTimer=null;
let nextLayerId=2, undoStack=[], redoStack=[], drawing=null, projectName='After Night Project';
function makeLayer(name='Слой 1'){return {id:nextLayerId++,name,visible:true,opacity:1,frames:[[]]};}
let layers=[makeLayer()];
function ensureFrames(n){layers.forEach(l=>{while(l.frames.length<n)l.frames.push([])});}
function frameCount(){return Math.max(1,...layers.map(l=>l.frames.length));}
function shapes(){return layers.filter(l=>l.visible).flatMap(l=>(l.frames[currentFrame]||[]).map(s=>({...s,opacity:(s.opacity??1)*l.opacity})));}
function snapshot(){undoStack.push(JSON.stringify({layers,currentLayer,currentFrame,W,H,bg,fps,projectName,nextLayerId}));if(undoStack.length>60)undoStack.shift();redoStack=[];updateUndo();}
function restore(s){const o=JSON.parse(s);layers=o.layers;currentLayer=o.currentLayer;currentFrame=o.currentFrame;W=o.W;H=o.H;bg=o.bg;fps=o.fps;projectName=o.projectName;nextLayerId=o.nextLayerId;canvas.width=W;canvas.height=H;syncControls();renderAll();}
function undo(){if(!undoStack.length)return;redoStack.push(JSON.stringify({layers,currentLayer,currentFrame,W,H,bg,fps,projectName,nextLayerId}));restore(undoStack.pop());updateUndo();status('Отменено');}
function redo(){if(!redoStack.length)return;undoStack.push(JSON.stringify({layers,currentLayer,currentFrame,W,H,bg,fps,projectName,nextLayerId}));restore(redoStack.pop());updateUndo();status('Повторено');}
function updateUndo(){$('undoBtn').disabled=!undoStack.length;$('redoBtn').disabled=!redoStack.length}
function status(t){$('statusText').textContent=t}
function syncControls(){$('docWidth').value=W;$('docHeight').value=H;$('fps').value=fps;$('background').value=bg;$('projectName').value=projectName;$('sizeLabel').textContent=`${W} × ${H}`;$('fpsLabel').textContent=fps;$('docTitle').textContent=projectName||'Без названия'}
function drawShape(c,s,alpha=1){c.save();c.globalAlpha=(s.opacity??1)*alpha;c.strokeStyle=s.color||'#8f32e8';c.fillStyle=s.color||'#8f32e8';c.lineWidth=s.size||8;c.lineCap='round';c.lineJoin='round';const effect=$('effect').value;if(effect==='glow'){c.shadowColor=s.color||'#8f32e8';c.shadowBlur=18}else if(effect==='shadow'){c.shadowColor='#000';c.shadowBlur=9;c.shadowOffsetX=3;c.shadowOffsetY=3}
if(s.type==='path'||s.type==='eraser'){c.globalCompositeOperation=s.type==='eraser'?'destination-out':'source-over';c.beginPath();(s.points||[]).forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke()}
else if(s.type==='line'){c.beginPath();c.moveTo(s.x,s.y);c.lineTo(s.x2,s.y2);c.stroke()}
else if(s.type==='rect'){if(s.fill)c.fillRect(s.x,s.y,s.x2-s.x,s.y2-s.y);else c.strokeRect(s.x,s.y,s.x2-s.x,s.y2-s.y)}
else if(s.type==='circle'){c.beginPath();c.ellipse((s.x+s.x2)/2,(s.y+s.y2)/2,Math.abs(s.x2-s.x)/2,Math.abs(s.y2-s.y)/2,0,0,Math.PI*2);s.fill?c.fill():c.stroke()}
else if(s.type==='text'){c.font=`${Math.max(12,s.size*3)}px system-ui`;c.fillText(s.text||'Текст',s.x,s.y)}
else if(s.type==='image'&&s.data){const im=new Image();im.src=s.data;if(im.complete)c.drawImage(im,s.x,s.y,s.w||200,s.h||150)}
c.restore()}
function render(){ctx.clearRect(0,0,W,H);if(bg!=='transparent'){ctx.fillStyle=bg;ctx.fillRect(0,0,W,H)}
if(onion&&currentFrame>0){layers.forEach(l=>{if(l.visible)(l.frames[currentFrame-1]||[]).forEach(s=>drawShape(ctx,s,.18))})}
layers.forEach(l=>{if(l.visible)(l.frames[currentFrame]||[]).forEach(s=>drawShape(ctx,{...s,opacity:(s.opacity??1)*l.opacity}))});
if(drawing){if(drawing.type==='path'||drawing.type==='eraser')drawShape(ctx,drawing);else drawShape(ctx,{...drawing,x2:drawing.x2,y2:drawing.y2})}
}
function renderAll(){render();renderLayers();renderFrames();syncControls()}
function renderLayers(){$('layerList').innerHTML='';layers.forEach((l,i)=>{const row=document.createElement('div');row.className='layer'+(i===currentLayer?' selected':'');row.innerHTML=`<button class="iconbtn" style="padding:3px 6px">${l.visible?'◉':'○'}</button><span>${esc(l.name)}</span><button class="iconbtn" style="padding:3px 6px">⋯</button>`;row.children[0].onclick=e=>{e.stopPropagation();l.visible=!l.visible;render();renderLayers()};row.children[2].onclick=e=>{e.stopPropagation();const n=prompt('Название слоя',l.name);if(n){l.name=n;renderLayers()}};row.onclick=()=>{currentLayer=i;renderLayers();status('Выбран '+l.name)};$('layerList').appendChild(row)})}
function renderFrames(){$('frames').innerHTML='';ensureFrames(frameCount());for(let i=0;i<frameCount();i++){const b=document.createElement('button');b.className='frame'+(i===currentFrame?' active':'');b.innerHTML=`<span>▧ ${i+1}</span><small>${layers.reduce((n,l)=>n+(l.frames[i]||[]).length,0)} объектов</small>`;b.onclick=()=>{currentFrame=i;render();renderFrames();$('frameCount').textContent=`Кадр ${i+1} / ${frameCount()}`};$('frames').appendChild(b)}$('frameCount').textContent=`Кадр ${currentFrame+1} / ${frameCount()}`}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function point(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
function activeShapes(){ensureFrames(currentFrame+1);return layers[currentLayer].frames[currentFrame]}
function toolName(t){return ({select:'Выбор',pen:'Кисть',eraser:'Ластик',line:'Линия',rect:'Прямоугольник',circle:'Эллипс',text:'Текст',hand:'Перемещение'})[t]||t}
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{currentTool=b.dataset.tool;document.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('active',x===b));$('toolLabel').textContent=toolName(currentTool);canvas.style.cursor=currentTool==='pen'?'crosshair':currentTool==='eraser'?'cell':'default'});
canvas.addEventListener('pointerdown',e=>{if(playing)return;canvas.setPointerCapture(e.pointerId);const p=point(e);if(currentTool==='select'||currentTool==='hand')return;if(currentTool==='text'){const txt=prompt('Текст на холсте','After Night');if(txt){snapshot();activeShapes().push({type:'text',x:p.x,y:p.y,text:txt,color:$('color').value,size:+$('brushSize').value,opacity:+$('opacity').value/100});render()}return}snapshot();drawing={type:currentTool==='pen'?'path':currentTool==='eraser'?'eraser':currentTool,x:p.x,y:p.y,x2:p.x,y2:p.y,points:[p],color:$('color').value,size:+$('brushSize').value,opacity:+$('opacity').value/100,fill:$('fill').value==='solid'};render()});
canvas.addEventListener('pointermove',e=>{if(!drawing)return;const p=point(e);if(drawing.type==='path'||drawing.type==='eraser')drawing.points.push(p);else{drawing.x2=p.x;drawing.y2=p.y}render()});
function endDraw(){if(!drawing)return;activeShapes().push(drawing);drawing=null;render();renderFrames();status('Изменения внесены')}
canvas.addEventListener('pointerup',endDraw);canvas.addEventListener('pointercancel',endDraw);
$('addLayerBtn').onclick=()=>{snapshot();const l=makeLayer('Слой '+(layers.length+1));l.frames=Array.from({length:frameCount()},()=>[]);layers.push(l);currentLayer=layers.length-1;renderLayers();status('Слой добавлен')};
$('delLayerBtn').onclick=()=>{if(layers.length===1){status('Нельзя удалить последний слой');return}snapshot();layers.splice(currentLayer,1);currentLayer=Math.max(0,currentLayer-1);renderAll();status('Слой удалён')};
$('addFrameBtn').onclick=()=>{snapshot();const n=frameCount();layers.forEach(l=>l.frames.splice(currentFrame+1,0,[]));currentFrame++;renderAll();status('Добавлен пустой кадр')};
$('duplicateFrameBtn').onclick=()=>{snapshot();layers.forEach(l=>l.frames.splice(currentFrame+1,0,JSON.parse(JSON.stringify(l.frames[currentFrame]||[]))));currentFrame++;renderAll();status('Кадр дублирован')};
$('deleteFrameBtn').onclick=()=>{if(frameCount()<=1)return; snapshot();layers.forEach(l=>l.frames.splice(currentFrame,1));currentFrame=Math.max(0,currentFrame-1);renderAll();status('Кадр удалён')};
$('onionBtn').onclick=()=>{onion=!onion;$('onionBtn').textContent='Луковая кожа: '+(onion?'вкл.':'выкл.');render()};
$('undoBtn').onclick=undo;$('redoBtn').onclick=redo;
$('applySizeBtn').onclick=()=>{snapshot();W=Math.max(64,Math.min(4096,+$('docWidth').value||1280));H=Math.max(64,Math.min(4096,+$('docHeight').value||720));canvas.width=W;canvas.height=H;renderAll();status('Размер холста применён')};
$('background').onchange=()=>{bg=$('background').value;render()};$('fps').onchange=()=>{fps=Math.max(1,Math.min(60,+$('fps').value||12));$('fpsLabel').textContent=fps};$('projectName').onchange=()=>{projectName=$('projectName').value;syncControls()};
$('fitBtn').onclick=()=>{canvas.style.width='min(100%, 850px)';canvas.style.height='auto';$('zoomLabel').textContent='Вписано'};
$('playBtn').onclick=()=>{if(playing){stopPlay();return}playing=true;$('playBtn').textContent='■ Стоп';let f=0;playTimer=setInterval(()=>{currentFrame=f%frameCount();render();renderFrames();f++},1000/fps)};
function stopPlay(){playing=false;clearInterval(playTimer);$('playBtn').textContent='▶ Просмотр';render()}
$('newBtn').onclick=()=>{if(!confirm('Создать новый проект? Несохранённые изменения будут потеряны.'))return;layers=[makeLayer()];currentLayer=currentFrame=0;W=1280;H=720;fps=12;bg='#ffffff';projectName='After Night Project';undoStack=[];redoStack=[];canvas.width=W;canvas.height=H;renderAll();status('Новый проект создан')};
function projectData(){return {format:'after-night-project',version:1,projectName,W,H,fps,bg,layers,currentLayer,currentFrame}}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),3000)}
function saveProject(){download(new Blob([JSON.stringify(projectData())],{type:'application/json'}),(projectName||'after-night')+'.anproj');status('Проект сохранён в файл')}
$('saveBtn').onclick=saveProject;$('openBtn').onclick=()=>$('projectInput').click();
$('projectInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const o=JSON.parse(await f.text());if(o.format!=='after-night-project')throw Error('Это не файл After Night');layers=o.layers;currentLayer=o.currentLayer||0;currentFrame=o.currentFrame||0;W=o.W;H=o.H;fps=o.fps||12;bg=o.bg||'#ffffff';projectName=o.projectName||'Открытый проект';nextLayerId=Math.max(2,...layers.map(l=>l.id+1));canvas.width=W;canvas.height=H;renderAll();status('Проект открыт')}catch(err){alert('Не удалось открыть проект: '+err.message)}e.target.value=''};
$('exportBtn').onclick=()=>{$('exportMenu').style.display=$('exportMenu').style.display==='block'?'none':'block'};
$('pngExport').onclick=()=>{render();canvas.toBlob(b=>download(b,(projectName||'frame')+'-'+(currentFrame+1)+'.png'));$('exportMenu').style.display='none';status('PNG экспортирован')};
$('jsonExport').onclick=()=>{saveProject();$('exportMenu').style.display='none'};
$('webmExport').onclick=async()=>{ $('exportMenu').style.display='none';if(!window.MediaRecorder||!canvas.captureStream){alert('Экспорт WebM не поддерживается этим браузером. Попробуй Chrome.');return}const stream=canvas.captureStream(fps);let rec;try{rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9'})}catch{rec=new MediaRecorder(stream)}const chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};rec.onstop=()=>{download(new Blob(chunks,{type:'video/webm'}),(projectName||'animation')+'.webm');stream.getTracks().forEach(t=>t.stop());status('WebM экспортирован')};rec.start();let i=0;const timer=setInterval(()=>{currentFrame=i%frameCount();render();i++;if(i>=frameCount()*2){clearInterval(timer);rec.stop();renderFrames()}},1000/fps);status('Запись анимации…')};
$('importImageBtn').onclick=()=>$('imageInput').click();
$('imageInput').onchange=e=>{const f=e.target.files[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{snapshot();activeShapes().push({type:'image',data:reader.result,x:20,y:20,w:Math.min(img.width,W-40),h:Math.min(img.height,H-40)});render();status('Изображение импортировано')};img.src=reader.result};reader.readAsDataURL(f);e.target.value=''};
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveProject()}if(e.key==='Escape'){$('exportMenu').style.display='none';if(playing)stopPlay()}});
if('serviceWorker' in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
syncControls();renderAll();updateUndo();
})();