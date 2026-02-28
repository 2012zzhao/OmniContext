import{f as L,d as O,s as u}from"./extractor-X-uBzicu.js";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))t(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&t(i)}).observe(document,{childList:!0,subtree:!0});function a(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function t(n){if(n.ep)return;n.ep=!0;const o=a(n);fetch(n.href,o)}})();const m="tags",p="session_tags";class j{async createTag(e,a){const t=await this.getAllTags();if(t.some(o=>o.name===e))return null;const n={id:`tag-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,name:e,color:a,createdAt:Date.now()};return t.push(n),await chrome.storage.local.set({[m]:t}),n}async getAllTags(){return(await chrome.storage.local.get(m))[m]||[]}async getTag(e){return(await this.getAllTags()).find(t=>t.id===e)||null}async updateTag(e,a){const t=await this.getAllTags(),n=t.findIndex(o=>o.id===e);n>=0&&(t[n]={...t[n],...a},await chrome.storage.local.set({[m]:t}))}async deleteTag(e){const t=(await this.getAllTags()).filter(o=>o.id!==e);await chrome.storage.local.set({[m]:t});const n=await this.getAllSessionTags();for(const o in n)n[o].includes(e)&&await this.removeTagFromSession(o,e)}async addTagToSession(e,a){const t=await this.getAllSessionTags();t[e]||(t[e]=[]),t[e].includes(a)||(t[e].push(a),await chrome.storage.local.set({[p]:t}))}async removeTagFromSession(e,a){const t=await this.getAllSessionTags();t[e]&&(t[e]=t[e].filter(n=>n!==a),t[e].length===0&&delete t[e],await chrome.storage.local.set({[p]:t}))}async getSessionTags(e){return(await this.getAllSessionTags())[e]||[]}async getAllSessionTags(){return(await chrome.storage.local.get(p))[p]||{}}async getSessionsByTag(e){const a=await this.getAllSessionTags(),t=[];for(const[n,o]of Object.entries(a))o.includes(e)&&t.push(n);return t}}const l=new j;function M(s){const e=new Date(s),a=e.getFullYear(),t=String(e.getMonth()+1).padStart(2,"0"),n=String(e.getDate()).padStart(2,"0"),o=String(e.getHours()).padStart(2,"0"),i=String(e.getMinutes()).padStart(2,"0");return`${a}-${t}-${n} ${o}:${i}`}function B(s,e){const a=L(s.platform),t=M(s.createdAt);let n="";return n=s.messages.map(o=>`[${o.role==="user"?"用户":a}] ${o.content}`).join(`

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
`}const H={doubao:"🔴",yuanbao:"🟡",claude:"🟣"},h=document.getElementById("session-list"),P=document.getElementById("current-page"),N=document.getElementById("export-btn"),k=document.getElementById("refresh-btn"),S=document.getElementById("toast"),x=document.getElementById("search-input"),C=document.getElementById("search-clear"),I=document.getElementById("filter-platform"),F=document.getElementById("filter-tags");let T=null,b=[],$=[],d="",y="",v=[];const E=new Set;function D(s,e){let a;return((...t)=>{clearTimeout(a),a=setTimeout(()=>s(...t),e)})}async function q(){try{const[s]=await chrome.tabs.query({active:!0,currentWindow:!0});s?.url&&(T=O(s.url),U())}catch(s){console.error("Failed to detect platform:",s)}await f(),N.addEventListener("click",et),k.addEventListener("click",f),x.addEventListener("input",D(R,300)),C.addEventListener("click",W),I.addEventListener("change",_)}function R(){d=x.value.trim(),C.style.display=d?"flex":"none",w()}function W(){x.value="",d="",C.style.display="none",w()}function _(){y=I.value,w()}function z(s,e){if(!e)return A(s);const a=A(s),t=new RegExp(`(${K(e)})`,"gi");return a.replace(t,'<span class="highlight">$1</span>')}function K(s){return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function U(){if(T){const s=L(T);P.textContent=`📍 当前: ${s}`}else P.textContent="📍 未在支持的AI平台"}async function f(){h.innerHTML='<div class="loading">加载中...</div>',b=await l.getAllTags(),F.innerHTML='<option value="">全部标签</option>'+b.map(e=>`<option value="${e.id}">${e.name}</option>`).join(""),$=await u.getAllSessions(),w()}async function w(){if($.length===0){h.innerHTML=`
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p>还没有保存的会话</p>
        <p style="font-size: 12px; margin-top: 8px;">在豆包、元宝或Claude聊天时<br>会自动保存</p>
      </div>
    `;return}let s=[...$];if(y&&(s=s.filter(t=>t.platform===y)),v.length>0){const t=s.map(async o=>{const i=await l.getSessionTags(o.id);return{session:o,sessionTagIds:i}});s=(await Promise.all(t)).filter(o=>v.every(i=>o.sessionTagIds.includes(i))).map(o=>o.session)}if(d){const t=d.toLowerCase();s=s.filter(n=>{const o=n.title.toLowerCase().includes(t),i=n.messages.some(c=>c.content.toLowerCase().includes(t));return o||i})}if(s.length===0&&(d||y||v.length>0)){h.innerHTML=`
      <div class="search-empty">
        <div class="search-empty-icon">🔍</div>
        <p>没有找到匹配的会话</p>
        <p style="font-size: 12px; margin-top: 8px;">试试其他关键词或筛选条件</p>
      </div>
    `;return}const e=s.reduce((t,n)=>(t[n.platform]||(t[n.platform]=[]),t[n.platform].push(n),t),{}),a=await Promise.all(Object.entries(e).map(async([t,n])=>{const o=await Promise.all(n.map(i=>G(i)));return J(t,o)}));h.innerHTML=a.join(""),Q()}async function G(s){const e=await l.getSessionTags(s.id),a=b.filter(t=>e.includes(t.id));return Y(s,a)}function Y(s,e){const a=new Date(s.updatedAt).toLocaleDateString("zh-CN"),t=e.map(o=>`<span class="tag" style="background: ${o.color}">${A(o.name)}</span>`).join(""),n=z(s.title,d);return`
    <div class="session-item" data-id="${s.id}">
      <div class="session-info">
        <div class="session-title">${n}</div>
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
  `}function J(s,e){const a=H[s],t=L(s),n=T===s,o=E.has(s);return`
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
  `}function Q(){document.querySelectorAll('[data-action="copy"]').forEach(s=>{s.addEventListener("click",async e=>{const t=e.target.closest(".session-item")?.getAttribute("data-id");t&&await V(t)})}),document.querySelectorAll('[data-action="edit"]').forEach(s=>{s.addEventListener("click",async e=>{const t=e.target.closest(".session-item")?.getAttribute("data-id");t&&await X(t)})}),document.querySelectorAll('[data-action="tags"]').forEach(s=>{s.addEventListener("click",async e=>{const t=e.target.closest(".session-item")?.getAttribute("data-id");t&&await Z(t)})}),document.querySelectorAll('[data-action="delete"]').forEach(s=>{s.addEventListener("click",async e=>{const t=e.target.closest(".session-item")?.getAttribute("data-id");t&&confirm("确定要删除这个会话吗？")&&await tt(t)})}),document.querySelectorAll(".platform-header").forEach(s=>{s.addEventListener("click",()=>{const e=s.getAttribute("data-platform");s.classList.toggle("collapsed"),s.classList.contains("collapsed")?E.add(e):E.delete(e);const t=s.nextElementSibling;t&&(t.style.display=t.style.display==="none"?"block":"none")})})}async function V(s){const e=await u.getSession(s);if(!e){r("会话不存在");return}const a=B(e);try{await navigator.clipboard.writeText(a),r("已复制到剪贴板！请粘贴到目标AI助手的输入框")}catch{const n=document.createElement("textarea");n.value=a,document.body.appendChild(n),n.select(),document.execCommand("copy"),document.body.removeChild(n),r("已复制到剪贴板！请粘贴到目标AI助手的输入框")}}async function X(s){const e=await u.getSession(s);if(!e)return;const a=prompt("编辑会话标题:",e.title);a&&a!==e.title&&(await u.updateSessionTitle(s,a),await f(),r("标题已更新"))}async function Z(s){const e=await u.getSession(s);if(!e)return;const a=await l.getSessionTags(s),t=await l.getAllTags(),n=t.map((c,g)=>`${g+1}. ${c.name} ${a.includes(c.id)?"(已添加)":""}`).join(`
`),o=prompt(`管理 "${e.title}" 的标签:

${n}

输入编号添加/删除标签，或输入新标签名称创建：`);if(!o)return;const i=parseInt(o,10);if(!isNaN(i)&&i>0&&i<=t.length){const c=t[i-1];a.includes(c.id)?(await l.removeTagFromSession(s,c.id),r(`已移除标签: ${c.name}`)):(await l.addTagToSession(s,c.id),r(`已添加标签: ${c.name}`))}else{const g=await l.createTag(o.trim(),"#1890ff");g?(await l.addTagToSession(s,g.id),r(`已创建并添加标签: ${g.name}`)):r("标签已存在或创建失败")}await f()}async function tt(s){await u.deleteSession(s),await f(),r("会话已删除")}async function et(){const s=await u.exportAllSessions(),e=new Blob([s],{type:"application/json"}),a=URL.createObjectURL(e),t=document.createElement("a");t.href=a,t.download=`omnicontext-backup-${new Date().toISOString().split("T")[0]}.json`,document.body.appendChild(t),t.click(),document.body.removeChild(t),URL.revokeObjectURL(a),r("备份文件已下载")}function r(s){S.textContent=s,S.classList.add("show"),setTimeout(()=>{S.classList.remove("show")},3e3)}function A(s){const e=document.createElement("div");return e.textContent=s,e.innerHTML}q();
