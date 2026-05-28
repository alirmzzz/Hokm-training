const suits = [
  {id:"S", fa:"پیک", sym:"♠", red:false},
  {id:"H", fa:"دل", sym:"♥", red:true},
  {id:"D", fa:"خشت", sym:"♦", red:true},
  {id:"C", fa:"گشنیز", sym:"♣", red:false},
];
const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
const players = ["تو","حریف راست","حریف روبه‌رو","یار / چپ"];

let deck=[], trump=null, round=1, score=0, history=[], currentTrick=[];

const $ = id => document.getElementById(id);

function makeDeck(){
  return suits.flatMap(s => ranks.map(r => ({rank:r, suit:s.id, suitFa:s.fa, sym:s.sym, red:s.red})));
}
function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function cardText(c){ return `${c.rank}${c.sym}`; }

function start(){
  deck=shuffle(makeDeck());
  trump=suits[Math.floor(Math.random()*suits.length)];
  round=1; score=0; history=[]; currentTrick=[];
  nextRound(true);
}

function nextRound(first=false){
  if(round>5){ endGame(); return; }
  currentTrick=[];
  let leadSuit = suits[Math.floor(Math.random()*suits.length)];
  let forcedVoidPlayer = Math.random()<0.45 ? Math.floor(Math.random()*4) : -1;

  for(let i=0;i<4;i++){
    let card;
    if(i===0 || i!==forcedVoidPlayer){
      const candidates=deck.filter(c=>c.suit===leadSuit.id);
      card = candidates.length ? candidates[0] : deck[0];
    } else {
      const candidates=deck.filter(c=>c.suit!==leadSuit.id);
      card = candidates.length ? candidates[0] : deck[0];
    }
    deck.splice(deck.indexOf(card),1);
    currentTrick.push({...card, player:players[i]});
  }
  history.push(...currentTrick);
  render();
}

function render(){
  $("trumpText").textContent = `${trump.fa} ${trump.sym}`;
  $("roundText").textContent = `${Math.min(round,5)} از ۵`;
  $("scoreText").textContent = score;

  $("cards").innerHTML = currentTrick.map(c => `
    <div class="card ${c.red?'red':''}">
      <small>${c.player}</small>
      <span>${cardText(c)}</span>
      <small>${c.suitFa}</small>
    </div>
  `).join("");

  renderQuestion();
  renderMemo(false);
  $("feedback").innerHTML="";
  $("checkBtn").disabled=false;
  $("nextBtn").disabled=true;
}

function getTruth(){
  const trumpCount = history.filter(c=>c.suit===trump.id).length;
  const aces = history.filter(c=>c.rank==="A").map(c=>c.suitFa);
  const voids = [];
  for(let i=0;i<history.length;i+=4){
    const trick=history.slice(i,i+4);
    const lead=trick[0]?.suit;
    trick.forEach(c=>{
      if(c.suit!==lead) voids.push(`${c.player}: ${suits.find(s=>s.id===lead).fa}`);
    });
  }
  return {trumpCount, aces:[...new Set(aces)], voids:[...new Set(voids)]};
}

function renderQuestion(){
  const q = `
    <div class="question">
      <label>تا این لحظه چند کارت حکم خارج شده؟</label>
      <input id="ansTrump" type="number" inputmode="numeric" min="0" max="13" placeholder="مثلاً ۳" />

      <label>کدام آس‌ها بازی شده‌اند؟</label>
      <div class="grid2">
        ${suits.map(s=>`<label><input type="checkbox" class="aceBox" value="${s.fa}"> آس ${s.fa}</label>`).join("")}
      </div>

      <label>آیا کسی در این دور خال لید را نداشت؟</label>
      <select id="ansVoid">
        <option value="unknown">نمی‌دانم / تشخیص ندادم</option>
        <option value="yes">بله</option>
        <option value="no">خیر</option>
      </select>
    </div>`;
  $("questionBox").innerHTML=q;
}

function check(){
  const truth=getTruth();
  const ansTrump=Number($("ansTrump").value);
  const aceAns=[...document.querySelectorAll(".aceBox:checked")].map(x=>x.value);
  const latest=currentTrick;
  const lead=latest[0].suit;
  const latestVoid=latest.some(c=>c.suit!==lead);
  const ansVoid=$("ansVoid").value;

  let gained=0;
  let parts=[];

  if(ansTrump===truth.trumpCount){ gained+=3; parts.push(`<span class="ok">✓ شمارش حکم درست بود.</span>`);}
  else parts.push(`<span class="bad">✗ حکم‌های خارج‌شده: ${truth.trumpCount} عدد.</span>`);

  const a1=aceAns.sort().join(",");
  const a2=truth.aces.sort().join(",");
  if(a1===a2){ gained+=3; parts.push(`<span class="ok">✓ آس‌ها درست بود.</span>`);}
  else parts.push(`<span class="bad">✗ آس‌های بازی‌شده: ${truth.aces.length?truth.aces.join("، "):"هیچ‌کدام"}.</span>`);

  if((ansVoid==="yes" && latestVoid) || (ansVoid==="no" && !latestVoid)){ gained+=2; parts.push(`<span class="ok">✓ تشخیص خال تمام‌شده درست بود.</span>`);}
  else parts.push(`<span class="bad">✗ در این دور ${latestVoid?"حداقل یک نفر خال لید را نداشت.":"همه خال لید را داشتند."}</span>`);

  score += gained;
  $("scoreText").textContent=score;
  $("feedback").innerHTML = `<b>امتیاز این دور: ${gained}/8</b><br>${parts.join("<br>")}`;
  renderMemo(true);
  $("checkBtn").disabled=true;
  $("nextBtn").disabled=false;
}

function renderMemo(show){
  const truth=getTruth();
  $("playedTrumpMemo").textContent = show ? `${truth.trumpCount} کارت` : "؟";
  $("acesMemo").textContent = show ? (truth.aces.length?truth.aces.join("، "):"هیچ‌کدام") : "؟";
  $("voidMemo").textContent = show ? (truth.voids.length?truth.voids.join(" | "):"فعلاً مورد قطعی ندارد") : "؟";
}

function endGame(){
  $("cards").innerHTML="";
  $("questionBox").innerHTML=`<p>تمرین تمام شد. امتیاز نهایی: <b>${score} از ۴۰</b></p>
  <p class="warn">هدف تمرین: اول دقت، بعد سرعت. روزی ۱۰ دست کافی است.</p>`;
  $("feedback").innerHTML="";
  $("nextBtn").disabled=true;
  $("checkBtn").disabled=true;
}

$("checkBtn").addEventListener("click", check);
$("nextBtn").addEventListener("click", ()=>{ round++; nextRound(); });
$("newGameBtn").addEventListener("click", start);

if("serviceWorker" in navigator){ navigator.serviceWorker.register("./sw.js"); }
start();
