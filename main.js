import {modal} from './modules/modal.js';
import {auth} from './modules/auth.js';
import {loader} from './modules/loader.js';
import {transcription} from './modules/transcription.js';

let enquetes,
    hotRes, 
    //accordion = document.getElementById('accordionJDC'),
    //rectAccordion = accordion.getBoundingClientRect(),
    wait = new loader(),
    cherche, curData, curConf;
    

//dimensionne les contenus
let rectFooter = d3.select('footer').node().getBoundingClientRect(),
rectHeader = d3.select('header').node().getBoundingClientRect(),
hMap = rectFooter.top-rectFooter.height-rectHeader.bottom;
d3.select('#contentMap')
    .style('height',hMap+"px")
    .style('overflow-y','scroll');
d3.select('#contentResources').style('height',hMap+"px");
let  rectMap = d3.select('#contentMap').node().getBoundingClientRect(),
    wMap = rectMap.width,
    aLLM,
    //initialisation des connexions
    a = new auth({'navbar':d3.select('#navbarConnect'),
        mail:'acehn@univ-paris8.fr',
        apiOmk:'../omk_acehn/api/',
        ident: '6iMR476c8tobWmXyJuuBDngXMbLN0rvf',
        key: 'FGBikCu7SxsUla3Fe9m02N7XsONPhgvt'
    });
//log l'utilisateur
a.getUser(u=>{
    console.log(u);
    wait.show();
    getGeo();
    a.omk.searchItems('resource_class_id=139',data=>{
        enquetes = data;     
        setMenu("#ddEnquete",data,"o:title",showEnquete);          
        wait.hide();
    })
});
//gestion des event de l'ihm
d3.select("#btnAddEnquete").on('click',e=>{
    console.log(e);
})

function showEnquete(e,eqt){
    // Set default locale for date formatting
    d3.timeFormatDefaultLocale({
        "dateTime": "%A, le %e %B %Y, %X",
        "date": "%d/%m/%Y",
        "time": "%H:%M:%S",
        "periods": ["AM", "PM"],
        "days": ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
        "shortDays": ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"],
        "months": ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
        "shortMonths": ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"]
    });
    console.log(eqt);            
    d3.select('#contentMap').select('*').remove();
    d3.select('#contentParams').select('*').remove();
    //informations sur l'enquête
    let eqtrs = [], iqtrs = [], nbRep = 0, 
    deb, fin, formatDate = d3.timeFormat("%d %B %Y"),
    html = `
        <h5 class="card-header">Enquête ${eqt['o:id']}
            <a href="${a.omk.getAdminLink(eqt)}" target="_blank">
                <img class="mx-2" style="height:20px;" src="assets/img/OmekaS.png" />
            </a>       
        </h5>
        <div class="card-body">
            <h3 class="card-title">${eqt['o:title']}</h3>
            <blockquote class="blockquote mb-0 text-start">
                <p>Enquête menée : </p>
                <footer class="blockquote-footer">entre le <span class="badge text-bg-danger" id="debEqt"></span> et le <span class="badge text-bg-danger" id="finEqt"></span></footer>
                <footer class="blockquote-footer">par <span class="badge text-bg-danger" id="nbEqteur"></span> enquêteur-trise(s)</footer>
                <footer class="blockquote-footer">auprès de <span class="badge text-bg-danger" id="nbItlc"></span> interlocuteur-trise(s)</footer>
                <footer class="blockquote-footer"><span class="badge text-bg-danger" id="nbRep"></span> ont été récoltée(s).</footer>
            </blockquote>
            <h5>Liste des questions</h5>
            <div id="listeQuestions" />                    
        </div>
        <div class="card-footer text-body-secondary">
            <button id="btnAddInt" class="btn btn-danger m-2" >Ajouter une interview <i class="fa-light fa-comments-question"></i></button>
        </div>`;
    d3.select('#contentMap').append('div').attr('class',"card text-bg-dark").html(html);
    d3.select("#btnAddInt").on("click",initEnquete);

    //liste des questions et des réponses    
    let acc = d3.select('#listeQuestions').append('div')
        .attr('id','accEnquetes')
        .attr('class',"accordion"),
    confs = acc.selectAll('div').data(eqt["eqt:hasQuestion"]).enter()
        .append('div').attr('class',"accordion-item");
    confs.append('h2').attr('class',"accordion-header")
        .append('button').attr('class',"accordion-button")
            .attr('type',"button")
            .attr('data-bs-toggle',"collapse")
            .attr('data-bs-target',(d,i)=>"#question"+eqt["o:id"]+"_"+d.value_resource_id)
            .attr('aria-expanded',"false")
            .attr('aria-controls',(d,i)=>"question"+eqt["o:id"]+"_"+d.value_resource_id)
            .html(d=>{
                return `${d.display_title} <a href="${a.omk.getAdminLink(null,d.value_resource_id,"o:Item")}" target="_blank">
                    <img class="mx-2" style="height:20px;" src="assets/img/OmekaS.png" />
                </a>`
            });
    let confBody =  confs.append('div').attr('class',"accordion-collapse collapse")
        .attr('id',(d,i)=>"question"+eqt["o:id"]+"_"+d.value_resource_id)
        .attr('data-bs-parent',"#accEnquetes")
        .append('div').attr('class',"accordion-body p-1");
    let ul = confBody.append('ul').attr('class',"list-group"),
    li = ul.selectAll('li').data(d=>getReponses(eqt["o:id"], d.value_resource_id)).enter()
        .append('li').attr('class',getListConfClass).on("click",selectRep),
    div = li.append('div').attr('class','d-flex w-100 justify-content-between');
    div.append('div').html(r=>{
        nbRep++;
        deb = deb < r.date ? deb : r.date;
        fin = fin > r.date ? fin : r.date;
        eqtrs.push(r['dcterms:creator'][0]);
        iqtrs.push(r['eqt:hasInterlocuteur'][0]);
        return 'Réponse '+r['o:id']+' : '
            +r['dcterms:creator'][0].display_title
            +' <-> '+r['eqt:hasInterlocuteur'][0].display_title;
    });
    div.append('h5').attr('class','mb-1')
        .text(r=>r['dcterms:dateSubmitted'][0]['#value']);   
    //affiche les stats de l'enquête
    d3.select("#debEqt").html(formatDate(deb));     
    d3.select("#finEqt").html(formatDate(fin)); 
    d3.select("#nbRep").html(nbRep); 
    d3.select("#nbEqteur").html(eqtrs.length==0 ? "0" : Array.from(d3.group(eqtrs, d => d.display_title))[0].length); 
    d3.select("#nbItlc").html(iqtrs.length==0 ? "0" : Array.from(d3.group(iqtrs, d => d.display_title))[0].length); 
    wait.hide(true);
}
function getListConfClass(d,i,v='visible'){
    let c = "list-group-item p-1 ";
    c += i%2 == 0 ? "list-group-item-light "+v : "list-group-item-dark "+v;
    return c;
}
function selectRep(e,d){
    console.log(d);
}
function getReponses(idEqt, idQst){
    let q = "property[0][joiner]=and&property[0][property]=285&property[0][type]=res&property[0][text]="
        +idEqt
        +"&property[1][joiner]=and&property[1][property]=286&property[1][type]=res&property[1][text]="
        +idQst,
    rs = a.omk.searchItems(q);
    rs.forEach(r => {
        r.date = !r["dcterms:dateSubmitted"] ? new Date() : new Date(r["dcterms:dateSubmitted"][0]["@value"]);
    });
    return rs;
}
function initEnquete(){
    let f = d3.select('#formEnquete');
    getGeo();
    //chargement des listes
    d3.select("#lstEnqueteurs").selectAll('li').data(getEnqueteurs()).enter().append('li')
        .text(d=>d['o:title'])
        .attr("class","dropdown-item")
        .on("click",(e,d)=>{
            d3.select("#sltEnqueteur").attr('value',d['o:title'])
        })
    d3.select("#lstInterlocuteurs").selectAll('li').data(getInterlocuteurs()).enter().append('li')
        .text(d=>d['o:title'])
        .attr("class","dropdown-item")
        .on("click",(e,d)=>{
            d3.select("#sltInterlocuteur").attr('value',d['o:title'])
        })
        
        // 

    f.attr('class','row visible');
}
function getEnqueteurs(){
    let q = "resource_class_id[]=114&item_set_id[]=492",
    rs = a.omk.searchItems(q);
    wait.hide(true);
    return rs;
}
function getInterlocuteurs(){
    let q = "resource_class_id[]=119",
    rs = a.omk.searchItems(q);
    wait.hide(true);
    return rs;
}

//gestion des positions
const options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
  };
  
  function successGeo(pos) {
    const crd = pos.coords;
    d3.select("#inptLong").attr('value',crd.longitude); 
    d3.select("#inptLat").attr('value',crd.latitude); 
  }
  
  function errorGeo(err) {
    console.warn(`ERROR(${err.code}): ${err.message}`);
  }

  function getGeo(){
    navigator.geolocation.getCurrentPosition(successGeo, errorGeo, options);
  }


  //gestion de l'enregistrement
  // https://github.com/mdn/dom-examples/blob/main/media/web-dictaphone/scripts/app.js
  // Set up basic variables for app
const record = document.querySelector(".record");
const stop = document.querySelector(".stop");
const soundClips = document.querySelector(".sound-clips");
const canvas = document.querySelector(".visualizer");
const mainSection = document.querySelector(".main-controls");

// Disable stop button while not recording
stop.disabled = true;

// Visualiser setup - create web audio api context and canvas
let audioCtx;
const canvasCtx = canvas.getContext("2d");

// Main block for doing the audio recording
if (navigator.mediaDevices.getUserMedia) {
  console.log("The mediaDevices.getUserMedia() method is supported.");

  const constraints = { audio: true };
  let chunks = [], mediaRecorder, intervalId;

  let onSuccess = function (stream) {
    mediaRecorder = new MediaRecorder(stream);

    visualize(stream);

    record.onclick = function () {
        startRecord();
        saveRecord();
    };

    stop.onclick = function () {
        stopRecord();
        clearInterval(intervalId);    
    };

    mediaRecorder.onstop = function (e) {
        saveSound();
    };

    mediaRecorder.ondataavailable = function (e) {
      chunks.push(e.data);
    };

  };

  let frags = 1, durFrag = 180000;//3 minutes
  function saveRecord(){
    //enregistre toutes les durFrag
    intervalId = setInterval(recordStopStart, durFrag);
  }
  function recordStopStart(){
    stopRecord();
    startRecord();
  }


  function startRecord(){
    mediaRecorder.start();
    console.log(mediaRecorder.state);
    console.log("Recorder started.");
    record.style.background = "red";

    stop.disabled = false;
    record.disabled = true;
  }
  function stopRecord(){
    mediaRecorder.stop();
    console.log(mediaRecorder.state);
    console.log("Recorder stopped.");
    record.style.background = "";
    record.style.color = "";
    stop.disabled = true;
    record.disabled = false;
  }

  function saveSound(){
    const clipContainer = document.createElement("article");
    const clipLabel = document.createElement("p");
    const audio = document.createElement("audio");
    const deleteButton = document.createElement("button");

    clipContainer.classList.add("clip");
    audio.setAttribute("controls", "");
    deleteButton.textContent = "Delete";
    deleteButton.className = "delete";

    clipLabel.textContent = "Fragment "+frags;
    frags ++;

    clipContainer.appendChild(audio);
    clipContainer.appendChild(clipLabel);
    clipContainer.appendChild(deleteButton);
    soundClips.appendChild(clipContainer);

    audio.controls = true;
    const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
    chunks = [];
    const audioURL = window.URL.createObjectURL(blob);
    audio.src = audioURL;
    console.log("recorder stopped");

    saveToOmk(blob, mediaRecorder.mimeType);

    deleteButton.onclick = function (e) {
      e.target.closest(".clip").remove();
    };

    clipLabel.onclick = function () {
      const existingName = clipLabel.textContent;
      const newClipName = prompt("Enter a new name for your sound clip?");
      if (newClipName === null) {
        clipLabel.textContent = existingName;
      } else {
        clipLabel.textContent = newClipName;
      }
    };     
    
}

  let onError = function (err) {
    console.log("The following error occured: " + err);
  };

  navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);
} else {
  console.log("MediaDevices.getUserMedia() not supported on your browser!");
}

function visualize(stream) {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  const source = audioCtx.createMediaStreamSource(stream);

  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  source.connect(analyser);

  draw();

  function draw() {
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = "rgb(200, 200, 200)";
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = "rgb(0, 0, 0)";

    canvasCtx.beginPath();

    let sliceWidth = (WIDTH * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      let v = dataArray[i] / 128.0;
      let y = (v * HEIGHT) / 2;

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  }
}

window.onresize = function () {
  canvas.width = mainSection.offsetWidth-12;
};

window.onresize();

/**merci à  https://franzeus.medium.com/record-audio-in-js-and-upload-as-wav-or-mp3-file-to-your-backend-1a2f35dea7e8
 * Uploads audio blob to your server
 * @params {Blob} audioBlob - The audio blob data
 * @params {string} fileType - 'mp3' or 'wav'
 * @return {Promise<object>)
 */
async function saveToOmk(audioBlob, fileType){

    let data = {
        "dcterms:title":"test", 
        "file":1, 
    };
    //save image to omeka
    a.omk.createItem(data,i=>{
        console.log(i);
    },false,audioBlob);    

}

