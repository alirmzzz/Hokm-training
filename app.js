const suits = [
  {id:"S", fa:"پیک", sym:"♠", red:false},
  {id:"H", fa:"دل", sym:"♥", red:true},
  {id:"D", fa:"خشت", sym:"♦", red:true},
  {id:"C", fa:"گشنیز", sym:"♣", red:false},
];
const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];

// چینش اصلاح‌شده طبق قانون حکم:
// بالا: یار من، پایین: من، چپ: حریف چپ، راست: حریف راست
const seats = [
  {key:"me", fa:"من", className:"me-card"},
  {key:"right", fa:"حریف راست", className:"right-card"},
  {key:"partner", fa:"یار من", className:"partner-card"},
  {key:"left", fa:"حریف چپ", className:"left-card"},
];

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
  nextRound();
}

function nextRound(){
  if(round>5){ endGame(); return; }
  currentTrick=[];

  const leadSuit = suits[Math.floor(Math.random()*suits.length)];
  const forcedVoidSeat = Math.random()<0.45 ? Math.floor(Math.random()*4) : -1;

  // شروع تمرینی از «من» است و گردش به راست، یار، چپ ادامه پیدا می‌کند.
  for(let i=0;i<4;i++){
    let card;
    if(i!==forcedVoidSeat){
      const sameSuit=deck.filter(c=>c.suit===leadSuit.id);
      card=sameSuit.length?sameSuit[0]:deck[0];
    }else{
      const otherSuit=deck.filter(c=>c.suit!==leadSuit.id);
      card=otherSuit.length?otherSuit[0]:deck[0];
    }
    deck.splice(deck.indexOf(card),1);
    currentTrick.push({...card, seat:seats[i]});
  }

  history.push(...currentTrick);
  render();
}

function render(){
  $("trumpText").textContent = `${trump.fa} ${trump.sym}`;
  $("roundText").textContent = `${Math.min(round,5)} از ۵`;
  $("scoreText").textContent = score;

  $("cards").innerHTML = currentTrick.map(c => `
    <div class="card ${c.red?'red':''} ${c.seat.className}">
      <small class="role">${c.seat.fa}</small>
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
    const leadFa=suits.find(s=>s.id===lead)?.fa;
    trick.forEach(c=>{
      if(c.suit!==lead) voids.push(`${c.seat.fa}: ${leadFa}`);
    });
  }
  return {trumpCount, aces:[...new Set(aces)], voids:[...new Set(voids)]};
}

function renderQuestion(){
  $("questionBox").innerHTML = `
    <label>تا این لحظه چند کارت حکم خارج شده؟</label>
    <input id="ansTrump" type="number" inputmode="numeric" min="0" max="13" placeholder="مثلاً ۳" />

    <label>کدام آس‌ها بازی شده‌اند؟</label>
    <div class="grid2">
      ${suits.map(s=>`<label><span>آس ${s.fa}</span><input type="checkbox" class="aceBox" value="${s.fa}"></label>`).join("")}
    </div>

    <label>آیا کسی در این دور خال لید را نداشت؟</label>
    <select id="ansVoid">
      <option value="unknown">نمی‌دانم / تشخیص ندادم</option>
      <option value="yes">بله</option>
      <option value="no">خیر</option>
    </select>
  `;
}

function check(){
  const truth=getTruth();
  const ansTrump=Number($("ansTrump").value);
  const aceAns=[...document.querySelectorAll(".aceBox:checked")].map(x=>x.value).sort().join(",");
  const realAces=truth.aces.sort().join(",");
  const lead=currentTrick[0].suit;
  const latestVoid=currentTrick.some(c=>c.suit!==lead);
  const ansVoid=$("ansVoid").value;

  let gained=0, parts=[];

  if(ansTrump===truth.trumpCount){gained+=3;parts.push(`<span class="ok">✓ شمارش حکم درست بود.</span>`);}
  else parts.push(`<span class="bad">✗ حکم‌های خارج‌شده: ${truth.trumpCount} عدد.</span>`);

  if(aceAns===realAces){gained+=3;parts.push(`<span class="ok">✓ آس‌ها درست بود.</span>`);}
  else parts.push(`<span class="bad">✗ آس‌های بازی‌شده: ${truth.aces.length?truth.aces.join("، "):"هیچ‌کدام"}.</span>`);

  if((ansVoid==="yes" && latestVoid) || (ansVoid==="no" && !latestVoid)){
    gained+=2;parts.push(`<span class="ok">✓ تشخیص خال تمام‌شده درست بود.</span>`);
  } else {
    parts.push(`<span class="bad">✗ در این دور ${latestVoid?"حداقل یک نفر خال لید را نداشت.":"همه خال لید را داشتند."}</span>`);
  }

  score+=gained;
  $("scoreText").textContent=score;
  $("feedback").innerHTML=`<b>امتیاز این دور: ${gained}/8</b><br>${parts.join("<br>")}`;
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
  <p class="warn">هدف: اول دقت، بعد سرعت. روزی ۱۰ دست کافی است.</p>`;
  $("feedback").innerHTML="";
  $("nextBtn").disabled=true;
  $("checkBtn").disabled=true;
}

$("checkBtn").addEventListener("click", check);
$("nextBtn").addEventListener("click", ()=>{round++;nextRound();});
$("newGameBtn").addEventListener("click", start);

if("serviceWorker" in navigator){navigator.serviceWorker.register("./sw.js");}
start();
