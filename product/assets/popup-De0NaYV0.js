import{f as T,d as $,s as d}from"./extractor-DveVbnxb.js";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))t(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&t(i)}).observe(document,{childList:!0,subtree:!0});function a(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function t(n){if(n.ep)return;n.ep=!0;const o=a(n);fetch(n.href,o)}})();const g="tags",f="session_tags";class A{async createTag(e,a){const t=await this.getAllTags();if(t.some(o=>o.name===e))return null;const n={id:`tag-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,name:e,color:a,createdAt:Date.now()};return t.push(n),await chrome.storage.local.set({[g]:t}),n}async getAllTags(){return(await chrome.storage.local.get(g))[g]||[]}async getTag(e){return(await this.getAllTags()).find(t=>t.id===e)||null}async updateTag(e,a){const t=await this.getAllTags(),n=t.findIndex(o=>o.id===e);n>=0&&(t[n]={...t[n],...a},await chrome.storage.local.set({[g]:t}))}async deleteTag(e){const t=(await this.getAllTags()).filter(o=>o.id!==e);await chrome.storage.local.set({[g]:t});const n=await this.getAllSessionTags();for(const o in n)n[o].includes(e)&&await this.removeTagFromSession(o,e)}async addTagToSession(e,a){const t=await this.getAllSessionTags();t[e]||(t[e]=[]),t[e].includes(a)||(t[e].push(a),await chrome.storage.local.set({[f]:t}))}async removeTagFromSession(e,a){const t=await this.getAllSessionTags();t[e]&&(t[e]=t[e].filter(n=>n!==a),t[e].length===0&&delete t[e],await chrome.storage.local.set({[f]:t}))}async getSessionTags(e){return(await this.getAllSessionTags())[e]||[]}async getAllSessionTags(){return(await chrome.storage.local.get(f))[f]||{}}async getSessionsByTag(e){const a=await this.getAllSessionTags(),t=[];for(const[n,o]of Object.entries(a))o.includes(e)&&t.push(n);return t}}const l=new A;function E(s){const e=new Date(s),a=e.getFullYear(),t=String(e.getMonth()+1).padStart(2,"0"),n=String(e.getDate()).padStart(2,"0"),o=String(e.getHours()).padStart(2,"0"),i=String(e.getMinutes()).padStart(2,"0");return`${a}-${t}-${n} ${o}:${i}`}function L(s,e){const a=T(s.platform),t=E(s.createdAt);let n="";return n=s.messages.map(o=>`[${o.role==="user"?"用户":a}] ${o.content}`).join(`

`),`【上下文引用】
以下是我之前在${a}的对话记录：

---
会话: ${s.title}
来源: ${a}
日期: ${t}
消息数: ${s.messageCount}

${n}
---

基于以上背景，请帮我继续...
`}const x={doubao:"🔴",yuanbao:"🟡",claude:"🟣"},y=document.getElementById("session-list"),S=document.getElementById("current-page"),C=document.getElementById("export-btn"),O=document.getElementById("refresh-btn"),w=document.getElementById("toast");let p=null,v=[];const h=new Set;async function P(){try{const[s]=await chrome.tabs.query({active:!0,currentWindow:!0});s?.url&&(p=$(s.url),j())}catch(s){console.error("Failed to detect platform:",s)}await m(),C.addEventListener("click",q),O.addEventListener("click",m)}function j(){if(p){const s=T(p);S.textContent=`📍 当前: ${s}`}else S.textContent="📍 未在支持的AI平台"}async function m(){y.innerHTML='<div class="loading">加载中...</div>',v=await l.getAllTags();const s=await d.getAllSessions();if(s.length===0){y.innerHTML=`
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p>还没有保存的会话</p>
        <p style="font-size: 12px; margin-top: 8px;">在豆包、元宝或Claude聊天时<br>会自动保存</p>
      </div>
    `;return}const e=s.reduce((t,n)=>(t[n.platform]||(t[n.platform]=[]),t[n.platform].push(n),t),{}),a=await Promise.all(Object.entries(e).map(async([t,n])=>{const o=await Promise.all(n.map(i=>M(i)));return N(t,o)}));y.innerHTML=a.join(""),B()}function N(s,e){const a=x[s],t=T(s),n=p===s,o=h.has(s);return`
    <div class="platform-group">
      <div class="platform-header ${o?"collapsed":""}" data-platform="${s}">
        ${a} ${t}
        ${n?'<span style="margin-left: 8px; font-size: 10px; background: #1890ff; color: white; padding: 2px 6px; border-radius: 4px;">当前</span>':""}
        <span class="platform-count">${e.length}个会话</span>
      </div>
      <div class="platform-sessions" style="display: ${o?"none":"block"}">
        ${e.join("")}
      </div>
    </div>
  `}async function M(s){const e=await l.getSessionTags(s.id),a=v.filter(t=>e.includes(t.id));return k(s,a)}function k(s,e){const a=new Date(s.updatedAt).toLocaleDateString("zh-CN"),t=e.map(n=>`<span class="tag" style="background: ${n.color}">${b(n.name)}</span>`).join("");return`
    <div class="session-item" data-id="${s.id}">
      <div class="session-info">
        <div class="session-title">${b(s.title)}</div>
        <div class="session-tags">${t}</div>
        <div class="session-meta">${a} · ${s.messageCount}条消息</div>
      </div>
      <div class="session-actions">
        <button class="btn-icon copy" title="复制上下文" data-action="copy">📋</button>
        <button class="btn-icon tag-btn" title="管理标签" data-action="tags">🏷️</button>
        <button class="btn-icon edit" title="编辑标题" data-action="edit">✏️</button>
        <button class="btn-icon delete" title="删除" data-action="delete">🗑️</button>
      </div>
    </div>
  `}function B(){document.querySelectorAll('[data-action="copy"]').forEach(s=>{s.addEventListener("click",async e=>{const t=e.target.closest(".session-item")?.getAttribute("data-id");t&&await H(t)})}),document.querySelectorAll('[data-action="edit"]').forEach(s=>{s.addEventListener("click",async e=>{const t=e.target.closest(".session-item")?.getAttribute("data-id");t&&await I(t)})}),document.querySelectorAll('[data-action="tags"]').forEach(s=>{s.addEventListener("click",async e=>{const t=e.target.closest(".session-item")?.getAttribute("data-id");t&&await D(t)})}),document.querySelectorAll('[data-action="delete"]').forEach(s=>{s.addEventListener("click",async e=>{const t=e.target.closest(".session-item")?.getAttribute("data-id");t&&confirm("确定要删除这个会话吗？")&&await F(t)})}),document.querySelectorAll(".platform-header").forEach(s=>{s.addEventListener("click",()=>{const e=s.getAttribute("data-platform");s.classList.toggle("collapsed"),s.classList.contains("collapsed")?h.add(e):h.delete(e);const t=s.nextElementSibling;t&&(t.style.display=t.style.display==="none"?"block":"none")})})}async function H(s){const e=await d.getSession(s);if(!e){c("会话不存在");return}const a=L(e);try{await navigator.clipboard.writeText(a),c("已复制到剪贴板！请粘贴到目标AI助手的输入框")}catch{const n=document.createElement("textarea");n.value=a,document.body.appendChild(n),n.select(),document.execCommand("copy"),document.body.removeChild(n),c("已复制到剪贴板！请粘贴到目标AI助手的输入框")}}async function I(s){const e=await d.getSession(s);if(!e)return;const a=prompt("编辑会话标题:",e.title);a&&a!==e.title&&(await d.updateSessionTitle(s,a),await m(),c("标题已更新"))}async function D(s){const e=await d.getSession(s);if(!e)return;const a=await l.getSessionTags(s),t=await l.getAllTags(),n=t.map((r,u)=>`${u+1}. ${r.name} ${a.includes(r.id)?"(已添加)":""}`).join(`
`),o=prompt(`管理 "${e.title}" 的标签:

${n}

输入编号添加/删除标签，或输入新标签名称创建：`);if(!o)return;const i=parseInt(o,10);if(!isNaN(i)&&i>0&&i<=t.length){const r=t[i-1];a.includes(r.id)?(await l.removeTagFromSession(s,r.id),c(`已移除标签: ${r.name}`)):(await l.addTagToSession(s,r.id),c(`已添加标签: ${r.name}`))}else{const u=await l.createTag(o.trim(),"#1890ff");u?(await l.addTagToSession(s,u.id),c(`已创建并添加标签: ${u.name}`)):c("标签已存在或创建失败")}await m()}async function F(s){await d.deleteSession(s),await m(),c("会话已删除")}async function q(){const s=await d.exportAllSessions(),e=new Blob([s],{type:"application/json"}),a=URL.createObjectURL(e),t=document.createElement("a");t.href=a,t.download=`omnicontext-backup-${new Date().toISOString().split("T")[0]}.json`,document.body.appendChild(t),t.click(),document.body.removeChild(t),URL.revokeObjectURL(a),c("备份文件已下载")}function c(s){w.textContent=s,w.classList.add("show"),setTimeout(()=>{w.classList.remove("show")},3e3)}function b(s){const e=document.createElement("div");return e.textContent=s,e.innerHTML}P();
