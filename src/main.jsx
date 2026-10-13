import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Hls from 'hls.js';
import { Home, Tv, Film, Clapperboard, ListVideo, Settings, Search, Plus, Link as LinkIcon, Upload, Play, Radio, Trash2, Menu, X, ChevronRight, MonitorPlay } from 'lucide-react';
import './style.css';

const starter = [
 {name:'Demonstração — adicione sua lista', group:'Comece aqui', url:'', logo:''}
];
function parseM3U(text) {
 const lines = text.replace(/\r/g, '').split('\n'); const out=[]; let meta=null;
 for (const raw of lines) {
   const line=raw.trim(); if (!line) continue;
   if (line.startsWith('#EXTINF')) {
     const name=(line.split(',').slice(1).join(',').trim() || 'Canal sem nome');
     const group=(line.match(/group-title="([^"]*)"/i)||[])[1]||'Outros';
     const logo=(line.match(/tvg-logo="([^"]*)"/i)||[])[1]||'';
     meta={name,group,logo};
   } else if (!line.startsWith('#') && meta) { out.push({...meta,url:line}); meta=null; }
 }
 return out;
}
function App(){
 const [section,setSection]=useState('Início'), [channels,setChannels]=useState([]), [active,setActive]=useState(null);
 const [loggedIn,setLoggedIn]=useState(false), [loginUser,setLoginUser]=useState(''), [loginPass,setLoginPass]=useState(''), [loginBusy,setLoginBusy]=useState(false);
 const XTREAM_SERVER='http://blushes.top';
 const [listName,setListName]=useState('Minha lista'), [url,setUrl]=useState(''), [showAdd,setShowAdd]=useState(false);
 const [query,setQuery]=useState(''), [category,setCategory]=useState('Todos'), [notice,setNotice]=useState('');
 const [mobileMenu,setMobileMenu]=useState(false); const videoRef=useRef(null); const fileRef=useRef(null);
 const groups=useMemo(()=>['Todos',...new Set(channels.map(c=>c.group||'Outros'))],[channels]);
 async function loginXtream(e){
   e?.preventDefault();
   if(!loginUser.trim()||!loginPass){setNotice('Digite seu usuário e sua senha.');return;}
   setLoginBusy(true);
   try{
     const base=XTREAM_SERVER.replace(/\/$/,'');
     const authUrl=`${base}/player_api.php?username=${encodeURIComponent(loginUser.trim())}&password=${encodeURIComponent(loginPass)}`;
     const authRes=await fetch(authUrl); if(!authRes.ok)throw new Error('auth');
     const auth=await authRes.json(); if(!auth?.user_info || auth.user_info.auth!==1)throw new Error('credentials');
     const creds=`username=${encodeURIComponent(loginUser.trim())}&password=${encodeURIComponent(loginPass)}`;
     const [liveRes,movieRes,seriesRes]=await Promise.all([
       fetch(`${base}/player_api.php?${creds}&action=get_live_streams`),
       fetch(`${base}/player_api.php?${creds}&action=get_vod_streams`),
       fetch(`${base}/player_api.php?${creds}&action=get_series`)
     ]);
     const [live,movies,series]=await Promise.all([liveRes.json(),movieRes.json(),seriesRes.json()]);
     const liveItems=Array.isArray(live)?live.map(c=>({name:c.name||'Canal',group:c.category_name||'TV ao Vivo',logo:c.stream_icon||'',url:`${base}/live/${encodeURIComponent(loginUser.trim())}/${encodeURIComponent(loginPass)}/${c.stream_id}.${c.container_extension||'m3u8'}`,kind:'live'})):[];
     const movieItems=Array.isArray(movies)?movies.map(c=>({name:c.name||'Filme',group:c.category_name||'Filmes',logo:c.stream_icon||'',url:`${base}/movie/${encodeURIComponent(loginUser.trim())}/${encodeURIComponent(loginPass)}/${c.stream_id}.${c.container_extension||'mp4'}`,kind:'movie'})):[];
     const seriesItems=Array.isArray(series)?series.map(c=>({name:c.name||'Série',group:c.category_name||'Séries',logo:c.cover||'',url:'',kind:'series'})):[];
     setChannels([...liveItems,...movieItems,...seriesItems]);setListName('Minha conta UniTV');setLoggedIn(true);setNotice(`Login realizado. ${liveItems.length} canais, ${movieItems.length} filmes e ${seriesItems.length} séries carregados.`);
   }catch{setNotice('Não foi possível entrar. Confira usuário e senha e verifique se o servidor está acessível pelo aplicativo.');}
   finally{setLoginBusy(false);}
 }
 const filtered=useMemo(()=>channels.filter(c=>(category==='Todos'||(c.group||'Outros')===category)&&c.name.toLowerCase().includes(query.toLowerCase())),[channels,category,query]);
 useEffect(()=>{
   const saved=localStorage.getItem('unitv_channels'); const savedName=localStorage.getItem('unitv_name');
   if(saved){try{setChannels(JSON.parse(saved));}catch{}} if(savedName)setListName(savedName);
 },[]);
 useEffect(()=>{if(channels.length)localStorage.setItem('unitv_channels',JSON.stringify(channels)); else localStorage.removeItem('unitv_channels');},[channels]);
 useEffect(()=>{localStorage.setItem('unitv_name',listName)},[listName]);
 useEffect(()=>{
   const v=videoRef.current; if(!v||!active?.url)return;
   let hls;
   if(v.canPlayType('application/vnd.apple.mpegurl')) v.src=active.url;
   else if(Hls.isSupported()){hls=new Hls();hls.loadSource(active.url);hls.attachMedia(v);hls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal)setNotice('Não foi possível reproduzir este endereço. Verifique a lista e o suporte ao formato.');});}
   else {v.src=active.url;}
   v.play().catch(()=>{});
   return ()=>{if(hls)hls.destroy();v.pause();v.removeAttribute('src');v.load();};
 },[active]);
 async function loadUrl(){
   if(!url.trim()){setNotice('Cole o endereço da sua lista M3U.');return;}
   try{
     const res=await fetch(url.trim()); if(!res.ok)throw new Error('http');
     const text=await res.text(); const parsed=parseM3U(text);
     if(!parsed.length)throw new Error('empty');
     setChannels(parsed);setActive(null);setShowAdd(false);setUrl('');setNotice(`${parsed.length} itens carregados com sucesso.`);
   }catch{setNotice('Não foi possível buscar a lista. O servidor pode bloquear acesso pelo navegador (CORS); nesse caso, importe o arquivo M3U baixado.');}
 }
 async function loadFile(file){
   if(!file)return;
   try{const text=await file.text();const parsed=parseM3U(text);if(!parsed.length){setNotice('Não encontrei canais nesse arquivo M3U.');return;}
   setChannels(parsed);setActive(null);setShowAdd(false);setNotice(`${parsed.length} itens importados.`);}
   catch{setNotice('Não foi possível ler o arquivo.');}
 }
 const nav=[['Início',Home],['TV ao Vivo',Tv],['Filmes',Film],['Séries',Clapperboard],['Listas IPTV',ListVideo],['Configurações',Settings]];
 const isLibrary=['TV ao Vivo','Filmes','Séries'].includes(section);
 if(!loggedIn) return <div className="login-screen"><form className="login-card" onSubmit={loginXtream}><img className="login-logo" src="/unitv-logo.png" alt="UniTV"/><p className="login-subtitle">Entre para acessar seus conteúdos</p><label className="field-label" htmlFor="xtream-user">Usuário</label><input id="xtream-user" className="field" autoComplete="username" value={loginUser} onChange={e=>setLoginUser(e.target.value)} placeholder="Digite seu usuário"/><label className="field-label" htmlFor="xtream-pass">Senha</label><input id="xtream-pass" className="field" type="password" autoComplete="current-password" value={loginPass} onChange={e=>setLoginPass(e.target.value)} placeholder="Digite sua senha"/><button className="primary full login-submit" disabled={loginBusy}>{loginBusy?'Conectando...':'Entrar'}</button><p className="login-footnote">Acesso via Xtream Codes</p>{notice&&<p className="login-error">{notice}</p>}</form></div>;
 return <div className="app">
  <aside className={`sidebar ${mobileMenu?'open':''}`}>
   <div className="brand"><img className="brand-logo" src="/unitv-logo.png" alt="UniTV"/><button className="close-menu" onClick={()=>setMobileMenu(false)}><X/></button></div>
   <div className="list-label">MENU PRINCIPAL</div>
   {nav.map(([name,Icon])=><button key={name} className={`nav-item ${section===name?'selected':''}`} onClick={()=>{setSection(name);setMobileMenu(false);if(name==='Listas IPTV')setShowAdd(true)}}><Icon size={19}/><span>{name}</span></button>)}
   <div className="sidebar-bottom"><div className="status-dot"></div><div><b>UniTV Player</b><small>Seu conteúdo, em um só lugar</small></div></div>
  </aside>
  {mobileMenu&&<div className="scrim" onClick={()=>setMobileMenu(false)}/>}
  <main className="main">
   <header className="topbar"><button className="mobile-toggle" onClick={()=>setMobileMenu(true)}><Menu/></button><div className="breadcrumb">UniTV <ChevronRight size={14}/><span>{section}</span></div><div className="top-actions"><div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar canais..."/></div><span className="avatar">U</span></div></header>
   <div className="content">
    {section==='Início'&&<>
      <section className="hero"><div className="hero-shade"></div><div className="hero-content"><span className="eyebrow"><span className="live-dot"/> SEU PLAYER IPTV</span><h1>Seu entretenimento.<br/><span className="red">Do seu jeito.</span></h1><p>Organize suas listas, encontre seus canais e reproduza seus conteúdos em um só lugar.</p><div className="hero-buttons"><button className="primary" onClick={()=>{setSection('TV ao Vivo')}}><Tv size={18}/> Ver canais</button><button className="secondary" onClick={()=>setShowAdd(true)}><Plus size={18}/> Adicionar lista</button></div></div><div className="hero-art"><div className="orb orb1"></div><div className="orb orb2"></div><div className="screen-icon"><MonitorPlay size={94} strokeWidth={1.2}/><span className="screen-play"><Play fill="currentColor" size={23}/></span></div></div><div className="hero-bottom"><span>UNITV PLAYER</span><span>LISTAS M3U · PLAYER HLS</span></div></section>
      <div className="section-heading"><div><h2>Acesso rápido</h2><p>Continue de onde quiser</p></div></div>
      <div className="quick-grid">
       {[['TV ao Vivo','Assista aos seus canais',Tv,'TV ao Vivo'],['Filmes','Explore sua biblioteca',Film,'Filmes'],['Séries','Encontre suas séries',Clapperboard,'Séries'],['Listas IPTV','Gerencie suas fontes',ListVideo,'Listas IPTV']].map(([title,desc,Icon,target],i)=><button className="quick-card" key={title} onClick={()=>{setSection(target);if(target==='Listas IPTV')setShowAdd(true)}}><span className={`quick-icon qi${i}`}><Icon size={23}/></span><span className="quick-copy"><b>{title}</b><small>{desc}</small></span><ChevronRight className="quick-arrow" size={18}/></button>)}
      </div>
      <div className="section-heading"><div><h2>{channels.length?'Sua lista':'Comece por aqui'}</h2><p>{channels.length?`${channels.length} itens importados`:'Adicione uma lista M3U para preencher sua biblioteca'}</p></div><button className="text-button" onClick={()=>setShowAdd(true)}>+ Adicionar lista</button></div>
      {channels.length?<div className="channel-grid">{channels.slice(0,8).map((c,i)=><ChannelCard key={i} c={c} onClick={()=>{setActive(c);setSection('TV ao Vivo')}}/>)}</div>:<div className="empty-state"><div className="empty-icon"><ListVideo size={30}/></div><div><b>Nenhuma lista adicionada ainda</b><p>Importe um arquivo M3U ou informe uma URL de lista autorizada.</p></div><button className="primary compact" onClick={()=>setShowAdd(true)}>Adicionar lista</button></div>}
    </>}
    {isLibrary&&<><div className="page-heading"><div><span className="eyebrow">SUA BIBLIOTECA</span><h1>{section}</h1><p>Conteúdo carregado da sua lista IPTV.</p></div><button className="secondary" onClick={()=>setShowAdd(true)}><Plus size={17}/> Adicionar lista</button></div>
      <div className="filter-row">{groups.map(g=><button key={g} className={`filter-chip ${category===g?'active':''}`} onClick={()=>setCategory(g)}>{g}</button>)}</div>
      {filtered.length?<div className="channel-grid">{filtered.map((c,i)=><ChannelCard key={i} c={c} onClick={()=>setActive(c)}/>)}</div>:<div className="empty-state"><div className="empty-icon"><Tv size={30}/></div><div><b>{channels.length?'Nenhum resultado encontrado':'Sua biblioteca está vazia'}</b><p>Adicione uma lista M3U para exibir canais e conteúdos.</p></div><button className="primary compact" onClick={()=>setShowAdd(true)}>Importar lista</button></div>}
    </>}
    {section==='Listas IPTV'&&<><div className="page-heading"><div><span className="eyebrow">GERENCIAMENTO</span><h1>Listas IPTV</h1><p>Importe e gerencie suas fontes de conteúdo.</p></div><button className="primary" onClick={()=>setShowAdd(true)}><Plus size={17}/> Nova lista</button></div>
      <div className="list-manager"><div className="manager-icon"><ListVideo size={24}/></div><div className="manager-info"><b>{listName}</b><p>{channels.length?`${channels.length} canais e itens disponíveis`:'Nenhuma lista carregada'}</p><span className="pill">{channels.length?'IMPORTADA':'AGUARDANDO LISTA'}</span></div><div className="manager-actions"><button className="secondary small" onClick={()=>setShowAdd(true)}>Adicionar / trocar</button><button className="icon-button" title="Remover lista" onClick={()=>{setChannels([]);setActive(null);setNotice('Lista removida.')}}><Trash2 size={17}/></button></div></div>
      <div className="info-note"><b>Privacidade</b><p>As listas importadas são guardadas localmente neste navegador. Use apenas URLs e conteúdos que você tem autorização para acessar.</p></div>
    </>}
    {section==='Configurações'&&<><div className="page-heading"><div><span className="eyebrow">PERSONALIZAÇÃO</span><h1>Configurações</h1><p>Gerencie sua experiência no UniTV.</p></div></div><div className="settings-list"><div className="setting"><div className="setting-icon"><Settings/></div><div><b>Nome da lista</b><p>Nome exibido no gerenciador de listas</p><input className="setting-input" value={listName} onChange={e=>setListName(e.target.value)}/></div></div><div className="setting"><div className="setting-icon"><MonitorPlay/></div><div><b>Reprodução de vídeo</b><p>O player suporta HLS quando o navegador ou o servidor permite.</p><small>Alguns streams exigem HTTPS, autorização ou suporte CORS.</small></div></div><div className="setting"><div className="setting-icon"><Radio/></div><div><b>Sobre o UniTV</b><p>UniTV Player · Projeto inicial 1.0.0</p></div></div></div></>}
   </div>
   <footer>© 2026 UniTV Player <span>Feito para organizar suas listas</span></footer>
  </main>
  {active&&<div className="player-modal"><div className="player-window"><div className="player-head"><div><span className="live-dot"/> REPRODUZINDO AGORA <b>{active.name}</b></div><button className="icon-button" onClick={()=>setActive(null)}><X/></button></div>{active.url?<video ref={videoRef} controls autoPlay playsInline/>:<div className="player-placeholder"><MonitorPlay size={55}/><b>Adicione uma lista para assistir</b><p>Este é um item de demonstração, sem endereço de vídeo.</p></div>}<div className="player-foot"><span>{active.group||'Sem categoria'}</span><span>Use somente conteúdo autorizado</span></div></div></div>}
  {showAdd&&<div className="modal-backdrop" onClick={()=>setShowAdd(false)}><div className="add-modal" onClick={e=>e.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">NOVA FONTE</span><h2>Adicionar lista IPTV</h2><p>Escolha como deseja importar seus conteúdos.</p></div><button className="icon-button" onClick={()=>setShowAdd(false)}><X/></button></div><label className="field-label">Nome da lista</label><input className="field" value={listName} onChange={e=>setListName(e.target.value)} placeholder="Ex.: Minha lista"/><label className="field-label">URL da lista M3U</label><div className="url-field"><LinkIcon size={18}/><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://exemplo.com/lista.m3u"/></div><button className="primary full" onClick={loadUrl}>Carregar por URL <ChevronRight size={17}/></button><div className="or"><span>OU</span></div><button className="upload-button" onClick={()=>fileRef.current?.click()}><Upload size={21}/><span><b>Importar arquivo M3U</b><small>Selecione um arquivo .m3u ou .m3u8 do seu dispositivo</small></span><ChevronRight size={18}/></button><input ref={fileRef} type="file" accept=".m3u,.m3u8,.txt,audio/x-mpegurl,application/vnd.apple.mpegurl" hidden onChange={e=>loadFile(e.target.files?.[0])}/><p className="modal-disclaimer">Use apenas listas e credenciais que você tem autorização para acessar. Não compartilhe seus dados com terceiros.</p></div></div>}
  {notice&&<div className="toast" onClick={()=>setNotice('')}>{notice}<button onClick={e=>{e.stopPropagation();setNotice('')}}><X size={15}/></button></div>}
 </div>
}
function ChannelCard({c,onClick}){return <button className="channel-card" onClick={onClick}><div className="channel-logo">{c.logo?<img src={c.logo} onError={e=>e.currentTarget.style.display='none'}/>:<Tv size={25}/>}</div><div className="channel-meta"><b>{c.name}</b><small>{c.group||'Outros'}</small></div><span className="card-play"><Play size={15} fill="currentColor"/></span></button>}
createRoot(document.getElementById('root')).render(<App/>);
