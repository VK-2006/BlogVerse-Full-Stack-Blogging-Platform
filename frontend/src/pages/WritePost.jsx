import { AlertTriangle, ArrowLeft, CheckCircle2, Download, ExternalLink, FileText, Image, Link2, LoaderCircle, Save, Send, UploadCloud, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;
function formatBytes(bytes) { if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB"; const units = ["B","KB","MB","GB"]; const index = Math.min(Math.floor(Math.log(bytes)/Math.log(1024)), units.length-1); return `${(bytes/1024**index).toFixed(index===0?0:1)} ${units[index]}`; }
function textToHtml(value) { return value.trim().split(/\n\s*\n/).filter(Boolean).map((p) => `<p>${p.replace(/\n/g,"<br>")}</p>`).join(""); }
function htmlToText(value) { const element = document.createElement("div"); element.innerHTML = value || ""; element.querySelectorAll("br").forEach((br) => br.replaceWith("\n")); element.querySelectorAll("p,h1,h2,h3,h4,li").forEach((node) => node.append("\n\n")); return (element.textContent || "").replace(/\n{3,}/g,"\n\n").trim(); }
function parseLinks(value) { return value.split("\n").map((line)=>line.trim()).filter(Boolean).map((line)=>{ const [first,...rest]=line.split("|"); return rest.length ? {label:first.trim()||"Related link",url:rest.join("|").trim()} : {label:"Related link",url:first.trim()}; }); }
function linksToText(links=[]) { return links.map((link)=>`${link.label || "Related link"} | ${link.url}`).join("\n"); }

export default function WritePost() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [categories,setCategories]=useState([]);
  const [form,setForm]=useState({title:"",excerpt:"",coverImage:"",content:"",categoryId:"",tags:"",relatedLinks:"",downloadEnabled:true});
  const [attachments,setAttachments]=useState([]);
  const [error,setError]=useState(""); const [success,setSuccess]=useState(""); const [busy,setBusy]=useState(false);
  const [uploading,setUploading]=useState(false); const [uploadProgress,setUploadProgress]=useState(0); const [dragActive,setDragActive]=useState(false); const [loadingPost,setLoadingPost]=useState(isEditing);
  const [moderation,setModeration]=useState({blocked:false,reason:""});

  useEffect(() => {
    api.get("/posts/meta/categories").then(({data})=>setCategories(data.categories)).catch((e)=>setError(e.message));
    if (!id) return;
    setLoadingPost(true);
    api.get(`/posts/manage/${id}`).then(({data})=>{
      const post=data.post;
      setForm({ title:post.title, excerpt:post.excerpt||"", coverImage:post.coverImage||"", content:htmlToText(post.content), categoryId:post.category?.id ? String(post.category.id) : "", tags:(post.tags||[]).map((item)=>item.tag.name).join(", "), relatedLinks:linksToText(post.links), downloadEnabled:Boolean(post.downloadEnabled) });
      setAttachments(post.attachments||[]);
      setModeration({blocked:Boolean(post.isBlocked),reason:post.blockedReason||""});
    }).catch((e)=>setError(e.message)).finally(()=>setLoadingPost(false));
  },[id]);

  const contentLength=useMemo(()=>form.content.trim().length,[form.content]);
  const canPublish=form.title.trim().length>=3&&form.excerpt.trim().length>=10&&contentLength>=20;
  function update(event){setForm({...form,[event.target.name]:event.target.value});setError("");setSuccess("");}

  async function uploadFiles(fileList){
    const files=Array.from(fileList||[]); if(!files.length)return;
    if(attachments.length+files.length>10)return setError("A post can contain a maximum of 10 attachments.");
    if(files.length>MAX_FILES)return setError(`Upload a maximum of ${MAX_FILES} files at one time.`);
    const oversized=files.find((file)=>file.size>MAX_FILE_SIZE); if(oversized)return setError(`${oversized.name} is larger than 10 MB.`);
    const body=new FormData(); files.forEach((file)=>body.append("files",file)); setUploading(true);setUploadProgress(0);setError("");
    try{const {data}=await api.post("/uploads/post",body,{headers:{"Content-Type":"multipart/form-data"},onUploadProgress:(event)=>{if(event.total)setUploadProgress(Math.round(event.loaded*100/event.total));}});setAttachments((current)=>[...current,...data.files]);setSuccess(data.message);const firstImage=data.files.find((file)=>file.mimeType.startsWith("image/"));if(firstImage&&!form.coverImage)setForm((current)=>({...current,coverImage:firstImage.url}));}
    catch(e){setError(e.message);}finally{setUploading(false);setUploadProgress(0);if(fileInputRef.current)fileInputRef.current.value="";}
  }
  function validate(status){if(!form.title.trim())return "Enter a title before saving.";if(status==="DRAFT")return "";if(form.title.trim().length<3)return "Published title must contain at least 3 characters.";if(form.excerpt.trim().length<10)return "Write a summary containing at least 10 characters.";if(form.content.trim().length<20)return "Write at least 20 characters before publishing.";for(const link of parseLinks(form.relatedLinks)){try{const parsed=new URL(link.url);if(!["http:","https:"].includes(parsed.protocol))return `Invalid related URL: ${link.url}`;}catch{return `Invalid related URL: ${link.url}`;}}return "";}

  async function save(status){
    const validationMessage=validate(status);if(validationMessage)return setError(validationMessage);
    setError("");setSuccess("");setBusy(true);
    try{const payload={title:form.title.trim(),excerpt:form.excerpt.trim(),coverImage:form.coverImage.trim(),status,categoryId:form.categoryId?Number(form.categoryId):null,tags:form.tags.split(",").map((tag)=>tag.trim()).filter(Boolean),content:textToHtml(form.content),downloadEnabled:Boolean(form.downloadEnabled),attachments,links:parseLinks(form.relatedLinks)};const {data}=isEditing?await api.put(`/posts/${id}`,payload):await api.post("/posts",payload);if(status==="PUBLISHED")navigate(`/post/${data.post.slug}`);else if(!isEditing)navigate(`/write/${data.post.id}`,{replace:true});else setSuccess("Draft updated successfully. You can continue editing or publish it now.");}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }

  if(loadingPost)return <div className="page-loader">Loading your draft...</div>;
  return <main className="page write-page gradient-page"><div className="container write-shell">
    {moderation.blocked&&<div className="moderation-owner-banner editor-moderation-banner"><AlertTriangle size={20}/><div><strong>This post is blocked by an administrator.</strong><span>{moderation.reason||"Update the draft if needed, then contact an admin to unblock it before publishing."}</span></div></div>}
    <div className="write-topbar"><Link to="/dashboard"><ArrowLeft size={18}/> Dashboard</Link><div><button className="button button-ghost" onClick={()=>save("DRAFT")} disabled={busy||uploading}><Save size={17}/> {isEditing?"Update draft":"Save draft"}</button><button className="button button-primary" onClick={()=>save("PUBLISHED")} disabled={busy||uploading||moderation.blocked}>{busy?<LoaderCircle className="spin" size={17}/>:<Send size={17}/>} {isEditing?"Publish / Update":"Publish"}</button></div></div>
    <div className="editor-layout">
      <section className="editor-main interactive-surface"><div className="editor-heading-row"><span className="overline">{isEditing?"Edit story":"New story"}</span><span className={`publish-readiness ${canPublish?"ready":""}`}>{canPublish?<CheckCircle2 size={15}/>:null}{canPublish?"Ready to publish":"Complete title, summary and story"}</span></div>
        <input className="title-input" name="title" value={form.title} onChange={update} maxLength={180} placeholder="Give your story a great title..."/><div className="field-counter">{form.title.length}/180</div>
        <textarea className="excerpt-input" name="excerpt" value={form.excerpt} onChange={update} maxLength={500} placeholder="Write a short summary that makes readers curious..."/><div className="field-counter">{form.excerpt.length}/500 · minimum 10 to publish</div>
        <textarea className="content-editor" name="content" value={form.content} onChange={update} placeholder={"Start writing your story...\n\nSeparate paragraphs with a blank line."}/><div className="field-counter">{contentLength} characters · minimum 20 to publish</div>
        {error&&<div className="form-error">{error}</div>}{success&&<div className="form-success"><CheckCircle2 size={17}/> {success}</div>}
      </section>
      <aside className="editor-sidebar interactive-surface"><h3>Story settings</h3>
        <section className="setting-group"><div className="setting-title"><UploadCloud size={18}/><span>Upload from laptop</span></div><input ref={fileInputRef} className="sr-only" type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip" onChange={(event)=>uploadFiles(event.target.files)}/><button type="button" className={`file-drop-zone ${dragActive?"drag-active":""}`} onClick={()=>fileInputRef.current?.click()} onDragEnter={(e)=>{e.preventDefault();setDragActive(true);}} onDragOver={(e)=>e.preventDefault()} onDragLeave={(e)=>{e.preventDefault();setDragActive(false);}} onDrop={(e)=>{e.preventDefault();setDragActive(false);uploadFiles(e.dataTransfer.files);}} disabled={uploading}>{uploading?<LoaderCircle className="spin"/>:<UploadCloud/>}<strong>{uploading?`Uploading ${uploadProgress}%`:"Choose or drop files"}</strong><span>Images, PDF, Word, PPT, Excel, text or ZIP · 10 MB each</span>{uploading&&<i style={{width:`${uploadProgress}%`}}/>}</button>
          {attachments.length>0&&<div className="attachment-editor-list">{attachments.map((file)=><div className="attachment-editor-item" key={file.storedName}><span className="attachment-file-icon">{file.mimeType.startsWith("image/")?<Image size={17}/>:<FileText size={17}/>}</span><div><strong>{file.originalName}</strong><span>{formatBytes(file.size)}</span></div>{file.mimeType.startsWith("image/")&&<button type="button" onClick={()=>setForm((current)=>({...current,coverImage:file.url}))} title="Use as cover"><Image size={15}/></button>}<button type="button" onClick={()=>setAttachments((current)=>current.filter((item)=>item.storedName!==file.storedName))} title="Remove"><X size={15}/></button></div>)}</div>}
        </section>
        <label className="download-setting-card"><input type="checkbox" checked={Boolean(form.downloadEnabled)} onChange={(event)=>setForm((current)=>({...current,downloadEnabled:event.target.checked}))}/><span><strong><Download size={17}/> Reader downloads</strong><small>When enabled, readers can download this story as a styled HTML file. You and administrators can always download your own story even when this is off.</small></span></label><label>Cover image URL<div className="input-with-trailing-icon"><input name="coverImage" value={form.coverImage} onChange={update} placeholder="https://..."/><ExternalLink size={16}/></div></label>
        <label>Category<select name="categoryId" value={form.categoryId} onChange={update}><option value="">Select category</option>{categories.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Tags<input name="tags" value={form.tags} onChange={update} placeholder="react, nodejs, career"/><small>Separate tags with commas.</small></label>
        <label><span className="setting-title"><Link2 size={17}/> Related URLs</span><textarea className="related-links-input" name="relatedLinks" value={form.relatedLinks} onChange={update} placeholder={"React docs | https://react.dev\nhttps://example.com"}/><small>One URL per line. Optional label before |.</small></label>
        {form.coverImage&&<a className="cover-preview-link" href={form.coverImage} target="_blank" rel="noreferrer"><img className="cover-preview" src={form.coverImage} alt="Cover preview"/><span>Preview <ExternalLink size={13}/></span></a>}
      </aside>
    </div>
  </div></main>;
}
