import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import {
  Sparkles, LayoutDashboard, Trophy, FolderKanban, UsersRound, MessageSquareText,
  GraduationCap, LogOut, Search, Plus, Trash2, Send, UserRound, ShieldCheck,
  Clock3, CheckCircle2, BookOpen, Menu, X
} from 'lucide-react';
import { supabase, hasSupabaseConfig, supabaseConfigMessage } from './lib/supabase';
import { api } from './lib/api';

const cx = (...x) => x.filter(Boolean).join(' ');

function useAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setLoading(false);
      return;
    }

    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) {
        try {
          const me = await api('/me');
          setProfile(me.profile);
        } catch {}
      }
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) { setProfile(null); setLoading(false); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  return { session, profile, loading };
}

function ConfigRequired() {
  return (
    <div className="authPage">
      <div className="authVisual">
        <div className="brand"><span className="logoMark">C</span><b>CampusHub</b></div>
        <div className="heroCopy">
          <span className="pill"><Sparkles size={14}/> Setup required</span>
          <h2>Supabase needs your project keys.</h2>
          <p>{supabaseConfigMessage}</p>
        </div>
      </div>
      <div className="authCardWrap">
        <div className="authForm">
          <div className="eyebrow">CONFIGURATION ERROR</div>
          <h1>App not connected yet.</h1>
          <p className="muted">Copy the example env files, add your real Supabase values, and restart the app to continue.</p>
          <div className="errorBox">{supabaseConfigMessage}</div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const auth = useAuth();

  if (!hasSupabaseConfig) return <ConfigRequired />;

  if (auth.loading) return <div className="splash"><div className="logoMark">C</div><h2>CampusHub</h2><span>Loading your campus workspace...</span></div>;

  return (
    <Routes>
      <Route path="/login" element={!auth.session ? <Login /> : <Navigate to={auth.profile?.role === 'management' ? '/management' : '/dashboard'} />} />
      <Route path="/register" element={!auth.session ? <Register /> : <Navigate to="/dashboard" />} />
      <Route path="/*" element={auth.session ? <Shell profile={auth.profile} /> : <Navigate to="/login" />} />
    </Routes>
  );
}

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');

    if (!hasSupabaseConfig) {
      setError(supabaseConfigMessage);
      setBusy(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else navigate('/');
    setBusy(false);
  }

  return (
    <AuthLayout mode={mode} setMode={setMode}>
      <form onSubmit={submit} className="authForm">
        <div className="eyebrow">{mode === 'student' ? 'STUDENT PORTAL' : 'MANAGEMENT PORTAL'}</div>
        <h1>Welcome back.</h1>
        <p className="muted">Sign in to continue to your CampusHub workspace.</p>
        <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@college.edu"/></label>
        <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••"/></label>
        {error && <div className="errorBox">{error}</div>}
        <button className="primary wide" disabled={busy}>{busy ? 'Signing in...' : `Sign in as ${mode}`}</button>
        {mode === 'student' && <p className="authSwitch">New here? <button type="button" className="textBtn" onClick={()=>navigate('/register')}>Create student account</button></p>}
        {mode === 'management' && <p className="hint">Management accounts are created/approved by your institution.</p>}
      </form>
    </AuthLayout>
  );
}

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({name:'', email:'', password:'', domain:'Artificial Intelligence'});
  const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');

    if (!hasSupabaseConfig) {
      setError(supabaseConfigMessage);
      setBusy(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { full_name: form.name, domain: form.domain } }
    });
    if (error) setError(error.message);
    else { alert('Account created. Check your email if email confirmation is enabled.'); navigate('/login'); }
    setBusy(false);
  }
  return (
    <AuthLayout mode="student" setMode={()=>{}}>
      <form onSubmit={submit} className="authForm">
        <div className="eyebrow">STUDENT REGISTRATION</div><h1>Build your campus profile.</h1>
        <p className="muted">Share your domain so CampusHub can connect you with relevant opportunities and peers.</p>
        <label>Full name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required /></label>
        <label>College email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required /></label>
        <label>Primary domain<select value={form.domain} onChange={e=>setForm({...form,domain:e.target.value})}>{DOMAINS.map(d=><option key={d}>{d}</option>)}</select></label>
        <label>Password<input type="password" minLength="6" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required /></label>
        {error && <div className="errorBox">{error}</div>}
        <button className="primary wide" disabled={busy}>{busy?'Creating...':'Create student account'}</button>
        <p className="authSwitch"><button type="button" className="textBtn" onClick={()=>navigate('/login')}>Back to login</button></p>
      </form>
    </AuthLayout>
  );
}

function AuthLayout({children,mode,setMode}) {
  return <div className="authPage">
    <div className="authVisual">
      <div className="brand"><span className="logoMark">C</span><b>CampusHub</b></div>
      <div className="heroCopy"><span className="pill"><Sparkles size={14}/> Learn · Build · Share</span><h2>Your campus, <em>connected.</em></h2><p>One interactive space for hackathons, projects, professors, experiences and AI-powered learning.</p>
        <div className="miniStats"><span><b>01</b> Discover</span><span><b>02</b> Collaborate</span><span><b>03</b> Grow</span></div>
      </div>
    </div>
    <div className="authCardWrap">
      <div className="loginMode"><button className={mode==='student'?'active':''} onClick={()=>setMode('student')}>Student</button><button className={mode==='management'?'active':''} onClick={()=>setMode('management')}>Management</button></div>
      {children}
    </div>
  </div>
}

const DOMAINS = ['Artificial Intelligence','Web Development','Mobile Development','Data Science','Cybersecurity','IoT & Embedded','Cloud Computing','Open Source','General'];

function Shell({profile}) {
  const [mobile,setMobile]=useState(false);
  const nav = profile?.role === 'management' ? [
    ['/management',LayoutDashboard,'Overview'], ['/management/hackathons',Trophy,'Hackathons'], ['/management/projects',FolderKanban,'Projects'], ['/management/professors',GraduationCap,'Professors'], ['/management/requests',MessageSquareText,'Requests']
  ] : [
    ['/dashboard',LayoutDashboard,'Dashboard'], ['/hackathons',Trophy,'Hackathons'], ['/projects',FolderKanban,'Projects'], ['/experiences',UsersRound,'Community'], ['/professors',GraduationCap,'Find Professor'], ['/ai',Sparkles,'AI Tutor']
  ];
  async function logout(){await supabase.auth.signOut();}
  return <div className="appShell">
    <aside className={cx("sidebar",mobile&&"open")}>
      <div className="sideBrand"><span className="logoMark">C</span><div><b>CampusHub</b><small>{profile?.role === 'management' ? 'Management' : 'Student'}</small></div><button className="iconBtn mobileClose" onClick={()=>setMobile(false)}><X/></button></div>
      <nav>{nav.map(([to,Icon,label])=><NavLink key={to} to={to} end={to==='/dashboard'||to==='/management'} onClick={()=>setMobile(false)} className={({isActive})=>cx("navItem",isActive&&"active")}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>
      <div className="sideBottom"><div className="profileMini"><div className="avatar">{profile?.full_name?.[0]?.toUpperCase()||'S'}</div><div><b>{profile?.full_name||'Student'}</b><small>{profile?.domain||'General'}</small></div></div><button className="navItem logout" onClick={logout}><LogOut size={18}/> Sign out</button></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="iconBtn mobileMenu" onClick={()=>setMobile(true)}><Menu/></button><div className="topSearch"><Search size={17}/><input placeholder="Search campus resources..." /></div><div className="topActions"><span className="statusDot"></span><span className="onlineText">CampusHub live</span><div className="avatar">{profile?.full_name?.[0]?.toUpperCase()||'S'}</div></div></header>
      <div className="content"><Routes>
        {profile?.role === 'management' ? <>
          <Route path="/" element={<Navigate to="/management"/>}/><Route path="/management" element={<ManagementOverview/>}/>
          <Route path="/management/hackathons" element={<ManagePage type="hackathons"/>}/><Route path="/management/projects" element={<ManagePage type="projects"/>}/>
          <Route path="/management/professors" element={<ManagePage type="professors"/>}/><Route path="/management/requests" element={<Requests management/>}/>
          <Route path="*" element={<Navigate to="/management"/>}/>
        </> : <>
          <Route path="/" element={<Navigate to="/dashboard"/>}/><Route path="/dashboard" element={<StudentDashboard profile={profile}/>}/>
          <Route path="/hackathons" element={<Hackathons/>}/><Route path="/projects" element={<Projects/>}/>
          <Route path="/experiences" element={<Experiences profile={profile}/>}/><Route path="/professors" element={<Professors/>}/>
          <Route path="/ai" element={<AITutor/>}/><Route path="*" element={<Navigate to="/dashboard"/>}/>
        </>}
      </Routes></div>
    </main>
  </div>
}

function PageTitle({eyebrow,title,desc,action}){return <div className="pageTitle"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{desc&&<p className="muted">{desc}</p>}</div>{action}</div>}

async function fetchTable(table, query = q => q) {
  let q = supabase.from(table).select('*');
  q = query(q); const {data,error}=await q;
  if(error) throw error; return data||[];
}

function StudentDashboard({profile}) {
  const [data,setData]=useState({hackathons:[],projects:[],experiences:[]});
  useEffect(()=>{Promise.all([fetchTable('hackathons',q=>q.order('created_at',{ascending:false}).limit(4)),fetchTable('projects',q=>q.order('created_at',{ascending:false}).limit(4)),fetchTable('experiences',q=>q.order('created_at',{ascending:false}).limit(3))]).then(([hackathons,projects,experiences])=>setData({hackathons,projects,experiences})).catch(console.error)},[]);
  return <><PageTitle eyebrow="STUDENT SPACE" title={`Good to see you, ${profile?.full_name?.split(' ')[0]||'Student'} 👋`} desc="Discover opportunities, learn with AI and turn your experience into guidance for others." action={<NavLink to="/ai" className="primary"><Sparkles size={17}/> Ask AI Tutor</NavLink>}/>
    <section className="heroBanner"><div><span className="pill">YOUR GROWTH HUB</span><h2>Learn something. Build something. <em>Share something.</em></h2><p>CampusHub connects students, mentors and opportunities in one place.</p></div><div className="heroOrb"><Sparkles size={48}/></div></section>
    <div className="statGrid"><Stat icon={Trophy} label="Hackathons" value={data.hackathons.length} hint="latest opportunities"/><Stat icon={FolderKanban} label="Projects" value={data.projects.length} hint="campus projects"/><Stat icon={UsersRound} label="Stories" value={data.experiences.length} hint="student experiences"/><Stat icon={GraduationCap} label="Mentors" value="Find" hint="ask a professor"/></div>
    <div className="twoCol"><section className="panel"><div className="panelHead"><div><b>Upcoming opportunities</b><small>Hackathons added by management</small></div><NavLink to="/hackathons" className="textBtn">View all</NavLink></div>{data.hackathons.map(h=><HackRow key={h.id} h={h}/>)}</section><section className="panel"><div className="panelHead"><div><b>Student voices</b><small>Learn from people who have done it</small></div><NavLink to="/experiences" className="textBtn">Explore</NavLink></div>{data.experiences.map(x=><div className="storyMini" key={x.id}><div className="avatar small">{x.title[0]}</div><div><b>{x.title}</b><p>{x.content.slice(0,100)}...</p><small>{x.domain}</small></div></div>)}</section></div>
  </>
}

function Stat({icon:Icon,label,value,hint}){return <div className="statCard"><div className="statIcon"><Icon size={19}/></div><div><small>{label}</small><strong>{value}</strong><span>{hint}</span></div></div>}

function HackRow({h}){return <div className="hackRow"><div className="dateBox">{h.event_date ? new Date(h.event_date).toLocaleDateString(undefined,{day:'2-digit',month:'short'}) : 'TBA'}</div><div className="grow"><b>{h.title}</b><p>{h.organizer} · {h.domain}</p></div><span className="tag">{h.status}</span>{h.registration_url&&<a href={h.registration_url} target="_blank" rel="noreferrer" className="arrowBtn">↗</a>}</div>}

function Hackathons(){const [items,setItems]=useState([]); const [search,setSearch]=useState(''); useEffect(()=>{fetchTable('hackathons',q=>q.order('event_date',{ascending:true})).then(setItems)},[]); const shown=items.filter(x=>(x.title+' '+x.domain+' '+x.organizer).toLowerCase().includes(search.toLowerCase())); return <><PageTitle eyebrow="DISCOVER" title="Hackathons" desc="Find opportunities that match your interests and build your experience."/><div className="filterBar"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search hackathons, domains or organizers..."/></div><div className="cardGrid">{shown.map(h=><article className="opCard" key={h.id}><div className="opTop"><span className="tag">{h.domain}</span><span className="muted">{h.event_date?new Date(h.event_date).toLocaleDateString():''}</span></div><h3>{h.title}</h3><p>{h.description}</p><div className="opFoot"><span>{h.organizer}</span>{h.registration_url&&<a href={h.registration_url} target="_blank" rel="noreferrer" className="primary smallBtn">Register ↗</a>}</div></article>)}</div></>}

function Projects(){const [items,setItems]=useState([]); useEffect(()=>{fetchTable('projects',q=>q.order('created_at',{ascending:false})).then(setItems)},[]); return <><PageTitle eyebrow="BUILD" title="Projects" desc="Explore projects and technologies being built across your campus."/><div className="cardGrid">{items.map(p=><article className="projectCard" key={p.id}><div className="projectIcon"><FolderKanban/></div><span className="tag">{p.domain}</span><h3>{p.title}</h3><p>{p.description}</p><div className="chips">{(p.tech_stack||[]).map(s=><span key={s}>{s}</span>)}</div>{p.project_url&&<a href={p.project_url} target="_blank" rel="noreferrer" className="textBtn">Open project ↗</a>}</article>)}</div></>}

function Experiences({profile}){const [items,setItems]=useState([]); const [form,setForm]=useState({title:'',content:'',domain:profile?.domain||'General',hackathon_name:''}); const [busy,setBusy]=useState(false); async function load(){setItems(await fetchTable('experiences',q=>q.order('created_at',{ascending:false})))} useEffect(()=>{load()},[]); async function post(e){e.preventDefault();setBusy(true); const {error}=await supabase.from('experiences').insert({...form,student_id:(await supabase.auth.getUser()).data.user.id}); if(error) alert(error.message); else {setForm({title:'',content:'',domain:profile?.domain||'General',hackathon_name:''});load()} setBusy(false)} return <><PageTitle eyebrow="COMMUNITY" title="Student experiences" desc="Share what you learned so another student can start faster."/><section className="panel postPanel"><div className="panelHead"><div><b>Publish your experience</b><small>Your practical lessons can help someone else.</small></div></div><form className="inlineForm" onSubmit={post}><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required placeholder="Title — e.g. What I learned at my first AI hackathon"/><select value={form.domain} onChange={e=>setForm({...form,domain:e.target.value})}>{DOMAINS.map(d=><option key={d}>{d}</option>)}</select><input value={form.hackathon_name} onChange={e=>setForm({...form,hackathon_name:e.target.value})} placeholder="Hackathon / event name"/><textarea value={form.content} onChange={e=>setForm({...form,content:e.target.value})} required placeholder="What happened? What worked? What would you do differently?"/><button className="primary" disabled={busy}><Send size={16}/>{busy?'Publishing...':'Publish story'}</button></form></section><div className="storyGrid">{items.map(x=><article className="storyCard" key={x.id}><div className="storyMeta"><div className="avatar">{x.title[0]}</div><span className="tag">{x.domain}</span></div><h3>{x.title}</h3><p>{x.content}</p>{x.hackathon_name&&<small>🏆 {x.hackathon_name}</small>}</article>)}</div></>}

function Professors(){const [profs,setProfs]=useState([]); const [requests,setRequests]=useState([]); const [topic,setTopic]=useState(''); const [message,setMessage]=useState(''); const [selected,setSelected]=useState(null); async function load(){const user=(await supabase.auth.getUser()).data.user;const [p,r]=await Promise.all([fetchTable('professors',q=>q.order('name')),fetchTable('professor_requests',q=>q.eq('student_id',user.id).order('created_at',{ascending:false}))]);setProfs(p);setRequests(r)} useEffect(()=>{load()},[]); async function request(){if(!selected||!topic)return;const user=(await supabase.auth.getUser()).data.user;const {error}=await supabase.from('professor_requests').insert({student_id:user.id,topic,message,professor_id:selected.id});if(error)alert(error.message);else{alert('Request sent to management.');setTopic('');setMessage('');load()}} return <><PageTitle eyebrow="MENTORSHIP" title="Find a professor" desc="Ask management to connect you with an available professor for your topic."/><div className="profGrid">{profs.map(p=><article className={cx("profCard",selected?.id===p.id&&"selected")} key={p.id} onClick={()=>setSelected(p)}><div className="profAvatar">{p.name.split(' ').slice(-1)[0][0]}</div><div className="availability">{p.availability}</div><h3>{p.name}</h3><p>{p.department}</p><span className="tag">{p.domain}</span><div className="chips">{(p.expertise||[]).map(x=><span key={x}>{x}</span>)}</div><button className="secondary wide">Request this professor</button></article>)}</div>{selected&&<div className="modalOverlay"><div className="modal"><button className="iconBtn close" onClick={()=>setSelected(null)}><X/></button><div className="eyebrow">PROFESSOR REQUEST</div><h2>{selected.name}</h2><p className="muted">Tell management what you need help with.</p><input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Topic / project area"/><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Describe your question or requirement..."/><button className="primary wide" onClick={request}><Send size={16}/> Send request</button></div></div>}<section className="panel"><div className="panelHead"><b>My requests</b><small>Management updates these when a professor is assigned.</small></div>{requests.length===0?<div className="empty">No professor requests yet.</div>:requests.map(r=><div className="requestRow" key={r.id}><div><b>{r.topic}</b><small>{r.message}</small></div><span className={cx("status",r.status)}>{r.status}</span></div>)}</section></>}

function AITutor(){const [messages,setMessages]=useState([{role:'assistant',text:'Hi! I’m CampusHub AI. Ask me about programming, AI, projects, hackathons, or any academic concept you want to understand.'}]);const [input,setInput]=useState('');const [busy,setBusy]=useState(false);async function send(e){e?.preventDefault();if(!input.trim()||busy)return;const question=input.trim();const next=[...messages,{role:'user',text:question}];setMessages(next);setInput('');setBusy(true);try{const out=await api('/ai/chat',{method:'POST',body:JSON.stringify({message:question,history:messages})});setMessages([...next,{role:'assistant',text:out.answer}])}catch(err){setMessages([...next,{role:'assistant',text:'I could not connect to the AI service right now. Check the backend and Gemini API configuration.'}])}setBusy(false)}return <div className="aiPage"><PageTitle eyebrow="LEARNING LAB" title="CampusHub AI Tutor" desc="A focused academic assistant powered by Gemini through your secure backend."/><div className="aiLayout"><aside className="aiAside"><div className="aiIcon"><Sparkles/></div><h3>Learn without getting stuck.</h3><p>Ask for explanations, examples, debugging help, project guidance or interview practice.</p><div className="suggestions">{['Explain recursion like I am a beginner','Help me plan an AI hackathon project','What is an API and how does it work?','Debug this Python concept for me'].map(s=><button key={s} onClick={()=>setInput(s)}>{s}<span>→</span></button>)}</div></aside><section className="chatPanel"><div className="chatHead"><div className="avatar ai">✦</div><div><b>CampusHub AI</b><small>Academic learning assistant</small></div><span className="liveBadge">ONLINE</span></div><div className="messages">{messages.map((m,i)=><div className={cx("bubbleRow",m.role)} key={i}><div className={cx("bubble",m.role)}>{m.text}</div></div>)}{busy&&<div className="bubbleRow assistant"><div className="bubble assistant typing">Thinking <span>•••</span></div></div>}</div><form className="chatInput" onSubmit={send}><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(e)}}} placeholder="Ask your question..."/><button className="primary"><Send size={17}/></button></form></section></div></div>}

function ManagementOverview(){const [counts,setCounts]=useState({}); useEffect(()=>{Promise.all(['profiles','hackathons','projects','professors','professor_requests'].map(t=>fetchTable(t))).then(a=>setCounts({students:a[0].filter(x=>x.role==='student').length,hackathons:a[1].length,projects:a[2].length,professors:a[3].length,pending:a[4].filter(x=>x.status==='pending').length}))},[]);return <><PageTitle eyebrow="MANAGEMENT CONTROL" title="Campus overview" desc="Monitor student activity and keep the academic ecosystem updated."/><div className="statGrid"><Stat icon={UsersRound} label="Students" value={counts.students??'—'} hint="registered learners"/><Stat icon={Trophy} label="Hackathons" value={counts.hackathons??'—'} hint="published"/><Stat icon={FolderKanban} label="Projects" value={counts.projects??'—'} hint="showcased"/><Stat icon={MessageSquareText} label="Pending requests" value={counts.pending??'—'} hint="need attention"/></div><div className="managementHero"><ShieldCheck size={36}/><div><h2>Keep the campus knowledge network moving.</h2><p>Add new opportunities, maintain project information, update professor availability and respond to mentorship requests.</p></div></div></>}

const CONFIG={
hackathons:{title:'Hackathons', table:'hackathons', fields:[['title','Title'],['organizer','Organizer'],['domain','Domain'],['description','Description'],['event_date','Event date'],['registration_url','Registration URL'],['status','Status']]},
projects:{title:'Projects', table:'projects', fields:[['title','Title'],['domain','Domain'],['description','Description'],['tech_stack','Tech stack (comma separated)'],['project_url','Project URL']]},
professors:{title:'Professors', table:'professors', fields:[['name','Name'],['department','Department'],['domain','Domain'],['email','Email'],['availability','Availability'],['expertise','Expertise (comma separated)']]}
};

function ManagePage({type}){const c=CONFIG[type];const [items,setItems]=useState([]);const [form,setForm]=useState({});const [edit,setEdit]=useState(null);async function load(){setItems(await fetchTable(c.table,q=>q.order('created_at',{ascending:false})))}useEffect(()=>{load()},[]);function normalize(){const out={...form};if(type==='projects')out.tech_stack=(form.tech_stack||'').split(',').map(x=>x.trim()).filter(Boolean);if(type==='professors')out.expertise=(form.expertise||'').split(',').map(x=>x.trim()).filter(Boolean);return out}async function save(e){e.preventDefault();try{const method=edit?'PUT':'POST';const path=`/management/${c.table}${edit?'/'+edit:''}`;await api(path,{method,body:JSON.stringify(normalize())});setForm({});setEdit(null);load()}catch(e){alert(e.message)}}async function del(id){if(!confirm('Delete this item?'))return;try{await api(`/management/${c.table}/${id}`,{method:'DELETE'});load()}catch(e){alert(e.message)}}function startEdit(x){setEdit(x.id);setForm({...x,tech_stack:(x.tech_stack||[]).join(', '),expertise:(x.expertise||[]).join(', ')})}return <><PageTitle eyebrow="CONTENT MANAGEMENT" title={c.title} desc={`Add, edit or remove ${c.title.toLowerCase()} from the student portal.`}/><div className="manageLayout"><form className="panel adminForm" onSubmit={save}><div className="panelHead"><b>{edit?'Edit':'Add'} {c.title.slice(0,-1)}</b><small>Changes are stored in Supabase.</small></div>{c.fields.map(([key,label])=><label key={key}>{label}{key==='description'?<textarea value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})} required/>:key==='domain'?<select value={form[key]||DOMAINS[0]} onChange={e=>setForm({...form,[key]:e.target.value})}>{DOMAINS.map(d=><option key={d}>{d}</option>)}</select>:key==='availability'?<select value={form[key]||'Available'} onChange={e=>setForm({...form,[key]:e.target.value})}><option>Available</option><option>Busy</option><option>On leave</option></select>:<input type={key==='event_date'?'date':key==='email'?'email':'text'} value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})} required={!['registration_url','project_url','email'].includes(key)}/>}</label>)}<div className="formActions"><button className="primary"><Plus size={17}/>{edit?'Save changes':'Add item'}</button>{edit&&<button type="button" className="secondary" onClick={()=>{setEdit(null);setForm({})}}>Cancel</button>}</div></form><section className="panel adminList"><div className="panelHead"><b>Current records</b><small>{items.length} records</small></div>{items.map(x=><div className="adminRow" key={x.id}><div><b>{x.title||x.name}</b><small>{x.domain||x.department||x.organizer}</small></div><button className="iconBtn" onClick={()=>startEdit(x)}>✎</button><button className="iconBtn danger" onClick={()=>del(x.id)}><Trash2 size={17}/></button></div>)}</section></div></>}

function Requests({management}){const [items,setItems]=useState([]);const [profs,setProfs]=useState([]);async function load(){const [r,p]=await Promise.all([fetchTable('professor_requests',q=>q.order('created_at',{ascending:false})),fetchTable('professors')]);setItems(r);setProfs(p)}useEffect(()=>{load()},[]);async function assign(id,professor_id){try{await api(`/management/requests/${id}`,{method:'PATCH',body:JSON.stringify({status:'assigned',professor_id})});load()}catch(e){alert(e.message)}}async function reject(id){await api(`/management/requests/${id}`,{method:'PATCH',body:JSON.stringify({status:'rejected',professor_id:null})});load()}return <><PageTitle eyebrow="MENTORSHIP DESK" title="Professor requests" desc="Review student requests and assign an available professor."/><div className="panel"><div className="panelHead"><b>Requests</b><small>{items.length} total</small></div>{items.length===0?<div className="empty">No requests yet.</div>:items.map(r=><div className="managementRequest" key={r.id}><div className="reqIcon"><MessageSquareText/></div><div className="grow"><b>{r.topic}</b><p>{r.message||'No additional message.'}</p><small>Student ID: {r.student_id.slice(0,8)}… · {new Date(r.created_at).toLocaleString()}</small></div><span className={cx("status",r.status)}>{r.status}</span>{r.status==='pending'&&<><select onChange={e=>e.target.value&&assign(r.id,e.target.value)} defaultValue=""><option value="">Assign professor</option>{profs.filter(p=>p.availability==='Available').map(p=><option key={p.id} value={p.id}>{p.name} — {p.domain}</option>)}</select><button className="iconBtn danger" onClick={()=>reject(r.id)}>×</button></>}</div>)}</div></>}

export default App;
