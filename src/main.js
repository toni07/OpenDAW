var ac = new (window.AudioContext || window.webkitAudioContext);

//var masterGainNode = ac.createGainNode();
//masterGainNode.connect(ac.destination);

var wavesurfer = (function () {
    'use strict';

    var createWavesurfer = function (song) {
        var bpm = 128;
        var startTimes = song.startTime;
        var sampleNumber = 0;
        var sampleUrl = song.url.split("/");
        var sampleTitle = sampleUrl[sampleUrl.length-1];
        $("#library").append("<li id=librarySample" + song.id +" class=\"librarySample\"><a href=\"#\">" + sampleTitle + "</a></li>");
        $("#librarySample" + song.id).draggable({ revert: true, helper: "clone" });
        $.each(startTimes, function(){
            var span = document.createElement('span');
            span.id = "sample" + song.id + "Span" + sampleNumber;
            var canvas = document.createElement('canvas');
            canvas.id = "sample" + song.id + "Canvas" + sampleNumber;
            $("#track"+song.track).append(span);
            $("#sample" + song.id + "Span" + sampleNumber).append(canvas);
            $("#sample" + song.id + "Span" + sampleNumber).width(parseFloat(song.duration) * ((10*bpm)/60));
            canvas.width = parseFloat(song.duration) * ((10*bpm)/60);
            canvas.height = 80;
            $( "#sample" + song.id + "Span" + sampleNumber).attr('data-startTime',song.startTime[sampleNumber]);
            $( "#sample" + song.id + "Span" + sampleNumber).css('left',"" + parseInt(song.startTime[sampleNumber]) + "px");
            $( "#sample" + song.id + "Span" + sampleNumber).draggable({
                axis: "x",
                containment: "parent",
                grid: [10, 0],
                stop: function() {
                    $( "#sample" + song.id + "Span" + sampleNumber).attr('data-startTime',parseInt($( "#sample" + song.id + "Span" + sampleNumber).css('left')));
                }
            });
            var wavesurfer = Object.create(WaveSurfer);
            wavesurfer.init({
                canvas: canvas,
                waveColor: 'violet',
                progressColor: 'purple',
                loadingColor: 'purple',
                cursorColor: 'navy',
                audioContext: ac
            });
            wavesurfer.load(song.url);
            sampleNumber++;
        });

        return wavesurfer;
    };

    var processData = function (json) {
        var wavesurfers = json.map(createWavesurfer);
    };

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (this.readyState == this.DONE && this.status == 200) {
            processData(JSON.parse(this.responseText));
        }
    };
    xhr.open('GET', 'src/data/samples.json');
    xhr.send();
}());

var buffers = [];
    //buffers.push({buffer: "buffer", name: "sample1"});
    var sample1 = "src/data/samples/Bliss_PercLoop2.mp3";
    load(sample1);
    
    console.log(buffers);	

    function load (src) {
  
    var xhr = new XMLHttpRequest();
    xhr.responseType = 'arraybuffer';

    xhr.addEventListener('load', function (e) {
        /*my.backend.loadData(
                e.target.response,
                my.drawBuffer.bind(my)
        );*/
        
        ac.decodeAudioData(
        e.target.response,
        function (buffer) {
           buffers.push({buffer: buffer, name: "sample1"});
          	
        },
        Error
        );			
    }, false);
    xhr.open('GET', src, true);
    xhr.send();
    };
            
initSched({
    bufferArray: buffers,
    audioContext: ac
});


$('body').bind('playPause-event', function(e){
    play2();
});
$('body').bind('pause-event', function(e){
    stop2();
});
$('body').bind('stepBackward-event', function(e){
    //scheduler.playAt(0);
});

$(document).ready(function(){
    $("#playPause").click(function(){
        $('body').trigger('playPause-event');
    });
    $("#pause").click(function(){
        $('body').trigger('pause-event');
    });
    $("#step-backward").click(function(){
        $('body').trigger('stepBackward-event');
    });
    $( "#track1" ).droppable({
        accept: ".librarySample"
    });
    var c=document.getElementById("timeline");
    var ctx=c.getContext("2d");
    ctx.font = '8pt Calibri';
    ctx.textAlign = 'center';
    for(var i=0;i<500;i+=10){
        ctx.moveTo(i,0);
        ctx.lineTo(i,10);
        ctx.stroke();
    }
    ctx.fillText("Bar",10,20);
    var bar = 2;
    for(var i=40;i<500;i+=40){
        ctx.fillText(bar, i, 20);
        bar++;
    }
});