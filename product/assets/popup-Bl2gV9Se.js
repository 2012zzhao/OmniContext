import{f as p,d as g,s as c}from"./extractor-Cw_yo6D4.js";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const s of i)if(s.type==="childList")for(const a of s.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function o(i){const s={};return i.integrity&&(s.integrity=i.integrity),i.referrerPolicy&&(s.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?s.credentials="include":i.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(i){if(i.ep)return;i.ep=!0;const s=o(i);fetch(i.href,s)}})();function y(t){const e=new Date(t),o=e.getFullYear(),n=String(e.getMonth()+1).padStart(2,"0"),i=String(e.getDate()).padStart(2,"0"),s=String(e.getHours()).padStart(2,"0"),a=String(e.getMinutes()).padStart(2,"0");return`${o}-${n}-${i} ${s}:${a}`}function v(t,e){const o=p(t.platform),n=y(t.createdAt);let i="";return i=t.messages.map(s=>`[${s.role==="user"?"用户":o}] ${s.content}`).join(`

`),`【上下文引用】
以下是我之前在${o}的对话记录：

---
会话: ${t.title}
来源: ${o}
日期: ${n}
消息数: ${t.messageCount}

${i}
---

基于以上背景，请帮我继续...
`}const b={doubao:"🔴",yuanbao:"🟡",claude:"🟣"},u=document.getElementById("session-list"),f=document.getElementById("current-page"),h=document.getElementById("export-btn"),S=document.getElementById("refresh-btn"),m=document.getElementById("toast");let d=null;async function w(){try{const[t]=await chrome.tabs.query({active:!0,currentWindow:!0});t?.url&&(d=g(t.url),E())}catch(t){console.error("Failed to detect platform:",t)}await l(),h.addEventListener("click",O),S.addEventListener("click",l)}function E(){if(d){const t=p(d);f.textContent=`📍 当前: ${t}`}else f.textContent="📍 未在支持的AI平台"}async function l(){u.innerHTML='<div class="loading">加载中...</div>';const t=await c.getAllSessions();if(t.length===0){u.innerHTML=`
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p>还没有保存的会话</p>
        <p style="font-size: 12px; margin-top: 8px;">在豆包、元宝或Claude聊天时<br>会自动保存</p>
      </div>
    `;return}const e=t.reduce((o,n)=>(o[n.platform]||(o[n.platform]=[]),o[n.platform].push(n),o),{});u.innerHTML=Object.entries(e).map(([o,n])=>L(o,n)).join(""),x()}function L(t,e){const o=b[t],n=p(t);return`
    <div class="platform-group">
      <div class="platform-header" data-platform="${t}">
        ${o} ${n}
        ${d===t?'<span style="margin-left: 8px; font-size: 10px; background: #1890ff; color: white; padding: 2px 6px; border-radius: 4px;">当前</span>':""}
        <span class="platform-count">${e.length}个会话</span>
      </div>
      <div class="platform-sessions">
        ${e.map(s=>$(s)).join("")}
      </div>
    </div>
  `}function $(t){const e=new Date(t.updatedAt).toLocaleDateString("zh-CN");return`
    <div class="session-item" data-id="${t.id}">
      <div class="session-info">
        <div class="session-title">${T(t.title)}</div>
        <div class="session-meta">${e} · ${t.messageCount}条消息</div>
      </div>
      <div class="session-actions">
        <button class="btn-icon copy" title="复制上下文" data-action="copy">📋</button>
        <button class="btn-icon edit" title="编辑标题" data-action="edit">✏️</button>
        <button class="btn-icon delete" title="删除" data-action="delete">🗑️</button>
      </div>
    </div>
  `}function x(){document.querySelectorAll('[data-action="copy"]').forEach(t=>{t.addEventListener("click",async e=>{const n=e.target.closest(".session-item")?.getAttribute("data-id");n&&await C(n)})}),document.querySelectorAll('[data-action="edit"]').forEach(t=>{t.addEventListener("click",async e=>{const n=e.target.closest(".session-item")?.getAttribute("data-id");n&&await A(n)})}),document.querySelectorAll('[data-action="delete"]').forEach(t=>{t.addEventListener("click",async e=>{const n=e.target.closest(".session-item")?.getAttribute("data-id");n&&confirm("确定要删除这个会话吗？")&&await I(n)})}),document.querySelectorAll(".platform-header").forEach(t=>{t.addEventListener("click",()=>{t.classList.toggle("collapsed");const e=t.nextElementSibling;e&&(e.style.display=e.style.display==="none"?"block":"none")})})}async function C(t){const e=await c.getSession(t);if(!e){r("会话不存在");return}const o=v(e);try{await navigator.clipboard.writeText(o),r("已复制到剪贴板！请粘贴到目标AI助手的输入框")}catch{const i=document.createElement("textarea");i.value=o,document.body.appendChild(i),i.select(),document.execCommand("copy"),document.body.removeChild(i),r("已复制到剪贴板！请粘贴到目标AI助手的输入框")}}async function A(t){const e=await c.getSession(t);if(!e)return;const o=prompt("编辑会话标题:",e.title);o&&o!==e.title&&(await c.updateSessionTitle(t,o),await l(),r("标题已更新"))}async function I(t){await c.deleteSession(t),await l(),r("会话已删除")}async function O(){const t=await c.exportAllSessions(),e=new Blob([t],{type:"application/json"}),o=URL.createObjectURL(e),n=document.createElement("a");n.href=o,n.download=`omnicontext-backup-${new Date().toISOString().split("T")[0]}.json`,document.body.appendChild(n),n.click(),document.body.removeChild(n),URL.revokeObjectURL(o),r("备份文件已下载")}function r(t){m.textContent=t,m.classList.add("show"),setTimeout(()=>{m.classList.remove("show")},3e3)}function T(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}w();
