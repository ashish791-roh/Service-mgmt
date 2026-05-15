exports.id=665,exports.ids=[665],exports.modules={1780:(a,b,c)=>{"use strict";c.d(b,{e:()=>j,k:()=>i});let d={Assigned:"been assigned to a technician","In Progress":"is now being worked on",Completed:"been completed",Delivered:"been delivered"},e={Assigned:"\uD83D\uDD27","In Progress":"⚙️",Completed:"✅",Delivered:"\uD83D\uDCE6"};function f(a,b="91"){let c=a.replace(/\D/g,"");return c.startsWith("0")?`+${b}${c.slice(1)}`:c.startsWith(b)&&c.length>=12?`+${c}`:`+${b}${c}`}async function g(a){let b=process.env.TWILIO_ACCOUNT_SID,c=process.env.TWILIO_AUTH_TOKEN,g=process.env.TWILIO_SMS_FROM;if(!b||!c||!g)return void console.warn("[customerNotifications] SMS env vars missing — skipping SMS.");let h=f(a.phone),i=function(a){let{customerName:b,jobId:c,newStatus:f,deviceInfo:g}=a,h=d[f],i=e[f],j=g?` (${g})`:"",k=c.slice(-8).toUpperCase(),l=`${i} FixHub Service Update
Hi ${b}, your repair job${j} has ${h}.
Job Ref: #${k} | Status: ${f}`;return"Completed"===f?l+=`
Your device is ready for pickup. Please visit us or call reception.`:"Delivered"===f&&(l+=`
Thank you for choosing FixHub!`),l}(a),j=`https://api.twilio.com/2010-04-01/Accounts/${b}/Messages.json`,k=Buffer.from(`${b}:${c}`).toString("base64"),l=new URLSearchParams({From:g,To:h,Body:i}),m=await fetch(j,{method:"POST",headers:{Authorization:`Basic ${k}`,"Content-Type":"application/x-www-form-urlencoded"},body:l.toString()}),n=await m.text();m.ok?console.log(`[customerNotifications] SMS sent successfully to ${h}. SID:`,JSON.parse(n)?.sid):(console.error(`[customerNotifications] SMS send failed (${m.status}):`,n),console.error(`[customerNotifications] Attempted: From=${g} To=${h}`))}async function h(a){if(!a.email)return;let b=process.env.SENDGRID_API_KEY,c=process.env.SENDGRID_FROM_EMAIL,f=process.env.SENDGRID_FROM_NAME??"FixHub Service";if(!b||!c)return void console.warn("[customerNotifications] SendGrid env vars missing — skipping email.");let g={personalizations:[{to:[{email:a.email,name:a.customerName}]}],from:{email:c,name:f},subject:function(a){let b=a.jobId.slice(-8).toUpperCase();return`[FixHub] Job #${b} — ${a.newStatus}`}(a),content:[{type:"text/html",value:function(a){let{customerName:b,jobId:c,newStatus:f,deviceInfo:g}=a,h=d[f],i=e[f],j=g?` (${g})`:"",k=c.slice(-8).toUpperCase();return`
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="font-family:sans-serif;background:#f3f4f6;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1);">
    <div style="background:#1d4ed8;padding:20px 24px;">
      <h2 style="margin:0;color:#fff;font-size:18px;">FixHub Service Update ${i}</h2>
    </div>
    <div style="padding:24px;">
      <p style="font-size:15px;margin-top:0;">Hi <strong>${b}</strong>,</p>
      <p style="font-size:15px;">Your repair job${j} has <strong>${h}</strong>.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:14px;">
        <tr>
          <td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;width:120px;">Job Ref</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;">#${k}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;">Status</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;">${f}</td>
        </tr>
      </table>
      ${"Completed"===f?'<p style="color:#16a34a;font-weight:600;">Your device is ready for pickup. Please visit us or contact reception at your earliest convenience.</p>':"Delivered"===f?'<p style="color:#2563eb;font-weight:600;">Thank you for choosing FixHub! We hope to see you again.</p>':""}
      <p style="font-size:13px;color:#6b7280;margin-bottom:0;">For queries, please contact our reception. Do not reply to this email directly.</p>
    </div>
    <div style="padding:12px 24px;background:#f9fafb;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;">
      FixHub Service Management &mdash; automated notification
    </div>
  </div>
</body>
</html>`}(a)}]},h=await fetch("https://api.sendgrid.com/v3/mail/send",{method:"POST",headers:{Authorization:`Bearer ${b}`,"Content-Type":"application/json"},body:JSON.stringify(g)});if(h.ok||202===h.status)console.log(`[customerNotifications] Email sent successfully to ${a.email}`);else{let a=await h.text();console.error(`[customerNotifications] Email send failed (${h.status}):`,a)}}async function i(a){await Promise.allSettled([g(a),h(a)]).then(a=>{a.forEach(a=>{"rejected"===a.status&&console.error("[customerNotifications] Unhandled notification error:",a.reason)})})}async function j(a){let b=process.env.TWILIO_ACCOUNT_SID,c=process.env.TWILIO_AUTH_TOKEN,d=process.env.TWILIO_SMS_FROM;if(!b||!c||!d)return void console.warn("[warranty] Twilio env vars missing — skipping warranty SMS.");let e=a.appBaseUrl??process.env.NEXT_PUBLIC_APP_URL??"",g=e?`${e}/api/jobs/${a.jobId}/warranty`:null,h=a.jobId.slice(-8).toUpperCase(),i=a.deviceInfo?` (${a.deviceInfo})`:"",j=`🛡️ FixHub Warranty Certificate
Hi ${a.customerName}, your repair${i} is covered by a ${a.warrantyDays}-day warranty.
Job Ref: #${h}`;g&&(j+=`
Download your certificate: ${g}`);let k=f(a.phone),l=`https://api.twilio.com/2010-04-01/Accounts/${b}/Messages.json`,m=Buffer.from(`${b}:${c}`).toString("base64"),n=new URLSearchParams({From:d,To:k,Body:j});try{let a=await fetch(l,{method:"POST",headers:{Authorization:`Basic ${m}`,"Content-Type":"application/x-www-form-urlencoded"},body:n.toString()});if(a.ok)console.log(`[warranty] Warranty SMS sent to ${k}`);else{let b=await a.text();console.error(`[warranty] SMS send failed (${a.status}):`,b)}}catch(a){console.error("[warranty] SMS send error:",a)}}},6487:()=>{},6798:(a,b,c)=>{"use strict";c.a(a,async(a,d)=>{try{c.d(b,{z:()=>i});var e=c(6330),f=c(627),g=c(4939),h=a([g,f]);[g,f]=h.then?(await h)():h;let i=globalThis.prisma??function(){let a="postgresql://neondb_owner:npg_JBZI0TQfCl1g@ep-lingering-river-aonhwaad.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";if(!a)throw Error("DATABASE_URL environment variable is not set");let b=new g.default.Pool({connectionString:a}),c=new f.M(b);return new e.PrismaClient({adapter:c,log:["error"]})}();d()}catch(a){d(a)}})},7360:(a,b,c)=>{"use strict";c.a(a,async(a,d)=>{try{c.d(b,{EQ:()=>q,Ji:()=>p,OC:()=>o,SK:()=>r,b1:()=>t,jg:()=>m,jw:()=>k,lx:()=>l,z4:()=>s});var e=c(6802),f=c(641),g=c(5511),h=c.n(g),i=c(6798),j=a([i]);i=(j.then?(await j)():j)[0];let s="fixhub_session";async function k(a){let b=h().randomBytes(32).toString("hex"),c=new Date(Date.now()+288e5);return await i.z.session.create({data:{token:b,userId:a.id,payload:a,expiresAt:c}}),i.z.session.deleteMany({where:{expiresAt:{lt:new Date}}}).catch(()=>{}),b}async function l(a){try{await i.z.session.deleteMany({where:{token:a}})}catch{}}async function m(a){try{await i.z.session.deleteMany({where:{userId:a}})}catch{}}async function n(a){try{let b=await i.z.session.findUnique({where:{token:a}});if(!b)return null;if(new Date(b.expiresAt)<new Date)return l(a).catch(()=>{}),null;return b.payload}catch{return null}}async function o(a){let b=await (0,e.UL)(),c=b.get(s)?.value;if(!c)return{error:f.NextResponse.json({error:"Authentication required."},{status:401})};let d=await n(c);return d?d.isActive?a&&!a.includes(d.role)?{error:f.NextResponse.json({error:"You do not have permission to perform this action."},{status:403})}:{user:d}:{error:f.NextResponse.json({error:"Account is disabled."},{status:403})}:{error:f.NextResponse.json({error:"Session expired or invalid. Please log in again."},{status:401})}}function p(a){return{name:s,value:a,httpOnly:!0,secure:!0,sameSite:"lax",path:"/",maxAge:28800}}function q(){return{name:s,value:"",httpOnly:!0,secure:!0,sameSite:"lax",path:"/",maxAge:0}}let t={name:120,email:254,password:128,phone:20,address:300,text:1e3,notes:2e3,shortText:200};function r(a){for(let[b,c,d]of a){let a="string"!=typeof b?null:b.length>d?`${c} must be at most ${d} characters.`:null;if(a)return a}return null}d()}catch(a){d(a)}})},7949:(a,b,c)=>{"use strict";c.a(a,async(a,d)=>{try{c.d(b,{Nr:()=>i,bq:()=>h,l4:()=>j});var e=c(6798),f=a([e]);e=(f.then?(await f)():f)[0];let k=!1;async function g(){k||(await e.z.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AuditLog" (
            "id"         TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
            "timestamp"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "userId"     TEXT         NOT NULL,
            "userName"   TEXT         NOT NULL,
            "userRole"   TEXT         NOT NULL,
            "action"     TEXT         NOT NULL,
            "entity"     TEXT         NOT NULL,
            "entityId"   TEXT,
            "field"      TEXT,
            "oldValue"   TEXT,
            "newValue"   TEXT,
            "meta"       TEXT,
            CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
        )
    `),await e.z.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp" DESC)
    `),await e.z.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId")
    `),await e.z.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId")
    `),k=!0)}async function h(a){try{await g();let b=a=>null==a?null:"string"==typeof a?a:JSON.stringify(a);await e.z.$executeRawUnsafe(`INSERT INTO "AuditLog"
             ("userId","userName","userRole","action","entity","entityId","field","oldValue","newValue","meta")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,a.actor.id,a.actor.name,a.actor.role,a.action,a.entity,a.entityId??null,a.field??null,b(a.oldValue),b(a.newValue),a.meta?JSON.stringify(a.meta):null)}catch(a){console.error("[auditLog] Failed to write audit entry:",a)}}async function i(a,b,c,d,e,f=["updatedAt","createdAt"]){let g=new Set([...Object.keys(d),...Object.keys(e)]),j=[];for(let i of g){if(f.includes(i))continue;let g=d[i],k=e[i],l=JSON.stringify(g)??"null",m=JSON.stringify(k)??"null";l!==m&&j.push(h({actor:a,action:"update",entity:b,entityId:c,field:i,oldValue:g,newValue:k}))}await Promise.all(j)}async function j(a={}){await g();let{limit:b=50,offset:c=0,userId:d,entity:f,entityId:h,action:i,from:k,to:l,search:m}=a,n=[],o=[],p=1;d&&(n.push(`"userId" = $${p++}`),o.push(d)),f&&(n.push(`"entity" = $${p++}`),o.push(f)),h&&(n.push(`"entityId" = $${p++}`),o.push(h)),i&&(n.push(`"action" = $${p++}`),o.push(i)),k&&(n.push(`"timestamp" >= $${p++}`),o.push(new Date(k))),l&&(n.push(`"timestamp" <= $${p++}`),o.push(new Date(l))),m&&(n.push(`("userName" ILIKE $${p} OR "entity" ILIKE $${p} OR "entityId" ILIKE $${p} OR "field" ILIKE $${p} OR "oldValue" ILIKE $${p} OR "newValue" ILIKE $${p})`),o.push(`%${m}%`),p++);let q=n.length>0?`WHERE ${n.join(" AND ")}`:"",r=await e.z.$queryRawUnsafe(`SELECT COUNT(*)::text AS count FROM "AuditLog" ${q}`,...o),s=parseInt(r[0]?.count??"0",10),t=await e.z.$queryRawUnsafe(`SELECT * FROM "AuditLog" ${q}
         ORDER BY "timestamp" DESC
         LIMIT $${p} OFFSET $${p+1}`,...o,b,c);return{total:s,rows:t.map(a=>({...a,timestamp:a.timestamp instanceof Date?a.timestamp.toISOString():String(a.timestamp)}))}}d()}catch(a){d(a)}})},8335:()=>{}};