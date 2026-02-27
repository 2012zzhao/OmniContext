import{f as w,d as v,s as d}from"./extractor-Cw_yo6D4.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))e(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&e(i)}).observe(document,{childList:!0,subtree:!0});function a(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function e(n){if(n.ep)return;n.ep=!0;const o=a(n);fetch(n.href,o)}})();const g="tags",f="session_tags";class ${async createTag(t,a){const e=await this.getAllTags();if(e.some(o=>o.name===t))return null;const n={id:`tag-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,name:t,color:a,createdAt:Date.now()};return e.push(n),await chrome.storage.local.set({[g]:e}),n}async getAllTags(){return(await chrome.storage.local.get(g))[g]||[]}async getTag(t){return(await this.getAllTags()).find(e=>e.id===t)||null}async updateTag(t,a){const e=await this.getAllTags(),n=e.findIndex(o=>o.id===t);n>=0&&(e[n]={...e[n],...a},await chrome.storage.local.set({[g]:e}))}async deleteTag(t){const e=(await this.getAllTags()).filter(o=>o.id!==t);await chrome.storage.local.set({[g]:e});const n=await this.getAllSessionTags();for(const o in n)n[o].includes(t)&&await this.removeTagFromSession(o,t)}async addTagToSession(t,a){const e=await this.getAllSessionTags();e[t]||(e[t]=[]),e[t].includes(a)||(e[t].push(a),await chrome.storage.local.set({[f]:e}))}async removeTagFromSession(t,a){const e=await this.getAllSessionTags();e[t]&&(e[t]=e[t].filter(n=>n!==a),e[t].length===0&&delete e[t],await chrome.storage.local.set({[f]:e}))}async getSessionTags(t){return(await this.getAllSessionTags())[t]||[]}async getAllSessionTags(){return(await chrome.storage.local.get(f))[f]||{}}async getSessionsByTag(t){const a=await this.getAllSessionTags(),e=[];for(const[n,o]of Object.entries(a))o.includes(t)&&e.push(n);return e}}const l=new $;function A(s){const t=new Date(s),a=t.getFullYear(),e=String(t.getMonth()+1).padStart(2,"0"),n=String(t.getDate()).padStart(2,"0"),o=String(t.getHours()).padStart(2,"0"),i=String(t.getMinutes()).padStart(2,"0");return`${a}-${e}-${n} ${o}:${i}`}function E(s,t){const a=w(s.platform),e=A(s.createdAt);let n="";return n=s.messages.map(o=>`[${o.role==="user"?"用户":a}] ${o.content}`).join(`

`),`【上下文引用】
以下是我之前在${a}的对话记录：

---
会话: ${s.title}
来源: ${a}
日期: ${e}
消息数: ${s.messageCount}

${n}
---

基于以上背景，请帮我继续...
`}const L={doubao:"🔴",yuanbao:"🟡",claude:"🟣"},y=document.getElementById("session-list"),T=document.getElementById("current-page"),x=document.getElementById("export-btn"),C=document.getElementById("refresh-btn"),h=document.getElementById("toast");let p=null,b=[];async function O(){try{const[s]=await chrome.tabs.query({active:!0,currentWindow:!0});s?.url&&(p=v(s.url),j())}catch(s){console.error("Failed to detect platform:",s)}await m(),x.addEventListener("click",F),C.addEventListener("click",m)}function j(){if(p){const s=w(p);T.textContent=`📍 当前: ${s}`}else T.textContent="📍 未在支持的AI平台"}async function m(){y.innerHTML='<div class="loading">加载中...</div>',b=await l.getAllTags();const s=await d.getAllSessions();if(s.length===0){y.innerHTML=`
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p>还没有保存的会话</p>
        <p style="font-size: 12px; margin-top: 8px;">在豆包、元宝或Claude聊天时<br>会自动保存</p>
      </div>
    `;return}const t=s.reduce((e,n)=>(e[n.platform]||(e[n.platform]=[]),e[n.platform].push(n),e),{}),a=await Promise.all(Object.entries(t).map(async([e,n])=>{const o=await Promise.all(n.map(i=>M(i)));return P(e,o)}));y.innerHTML=a.join(""),B()}function P(s,t){const a=L[s],e=w(s);return`
    <div class="platform-group">
      <div class="platform-header" data-platform="${s}">
        ${a} ${e}
        ${p===s?'<span style="margin-left: 8px; font-size: 10px; background: #1890ff; color: white; padding: 2px 6px; border-radius: 4px;">当前</span>':""}
        <span class="platform-count">${t.length}个会话</span>
      </div>
      <div class="platform-sessions">
        ${t.join("")}
      </div>
    </div>
  `}async function M(s){const t=await l.getSessionTags(s.id),a=b.filter(e=>t.includes(e.id));return N(s,a)}function N(s,t){const a=new Date(s.updatedAt).toLocaleDateString("zh-CN"),e=t.map(n=>`<span class="tag" style="background: ${n.color}">${S(n.name)}</span>`).join("");return`
    <div class="session-item" data-id="${s.id}">
      <div class="session-info">
        <div class="session-title">${S(s.title)}</div>
        <div class="session-tags">${e}</div>
        <div class="session-meta">${a} · ${s.messageCount}条消息</div>
      </div>
      <div class="session-actions">
        <button class="btn-icon copy" title="复制上下文" data-action="copy">📋</button>
        <button class="btn-icon tag-btn" title="管理标签" data-action="tags">🏷️</button>
        <button class="btn-icon edit" title="编辑标题" data-action="edit">✏️</button>
        <button class="btn-icon delete" title="删除" data-action="delete">🗑️</button>
      </div>
    </div>
  `}function B(){document.querySelectorAll('[data-action="copy"]').forEach(s=>{s.addEventListener("click",async t=>{const e=t.target.closest(".session-item")?.getAttribute("data-id");e&&await H(e)})}),document.querySelectorAll('[data-action="edit"]').forEach(s=>{s.addEventListener("click",async t=>{const e=t.target.closest(".session-item")?.getAttribute("data-id");e&&await I(e)})}),document.querySelectorAll('[data-action="tags"]').forEach(s=>{s.addEventListener("click",async t=>{const e=t.target.closest(".session-item")?.getAttribute("data-id");e&&await k(e)})}),document.querySelectorAll('[data-action="delete"]').forEach(s=>{s.addEventListener("click",async t=>{const e=t.target.closest(".session-item")?.getAttribute("data-id");e&&confirm("确定要删除这个会话吗？")&&await D(e)})}),document.querySelectorAll(".platform-header").forEach(s=>{s.addEventListener("click",()=>{s.classList.toggle("collapsed");const t=s.nextElementSibling;t&&(t.style.display=t.style.display==="none"?"block":"none")})})}async function H(s){const t=await d.getSession(s);if(!t){c("会话不存在");return}const a=E(t);try{await navigator.clipboard.writeText(a),c("已复制到剪贴板！请粘贴到目标AI助手的输入框")}catch{const n=document.createElement("textarea");n.value=a,document.body.appendChild(n),n.select(),document.execCommand("copy"),document.body.removeChild(n),c("已复制到剪贴板！请粘贴到目标AI助手的输入框")}}async function I(s){const t=await d.getSession(s);if(!t)return;const a=prompt("编辑会话标题:",t.title);a&&a!==t.title&&(await d.updateSessionTitle(s,a),await m(),c("标题已更新"))}async function k(s){const t=await d.getSession(s);if(!t)return;const a=await l.getSessionTags(s),e=await l.getAllTags(),n=e.map((r,u)=>`${u+1}. ${r.name} ${a.includes(r.id)?"(已添加)":""}`).join(`
`),o=prompt(`管理 "${t.title}" 的标签:

${n}

输入编号添加/删除标签，或输入新标签名称创建：`);if(!o)return;const i=parseInt(o,10);if(!isNaN(i)&&i>0&&i<=e.length){const r=e[i-1];a.includes(r.id)?(await l.removeTagFromSession(s,r.id),c(`已移除标签: ${r.name}`)):(await l.addTagToSession(s,r.id),c(`已添加标签: ${r.name}`))}else{const u=await l.createTag(o.trim(),"#1890ff");u?(await l.addTagToSession(s,u.id),c(`已创建并添加标签: ${u.name}`)):c("标签已存在或创建失败")}await m()}async function D(s){await d.deleteSession(s),await m(),c("会话已删除")}async function F(){const s=await d.exportAllSessions(),t=new Blob([s],{type:"application/json"}),a=URL.createObjectURL(t),e=document.createElement("a");e.href=a,e.download=`omnicontext-backup-${new Date().toISOString().split("T")[0]}.json`,document.body.appendChild(e),e.click(),document.body.removeChild(e),URL.revokeObjectURL(a),c("备份文件已下载")}function c(s){h.textContent=s,h.classList.add("show"),setTimeout(()=>{h.classList.remove("show")},3e3)}function S(s){const t=document.createElement("div");return t.textContent=s,t.innerHTML}O();
