var ac = new (window.AudioContext || window.webkitAudioContext);
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia
var masterGainNode = ac.createGain();
masterGainNode.gain.value = .8;
masterGainNode.connect(ac.destination);

var micStream;

//array of track master gain nodes
var trackMasterGains = [];
var trackVolumeGains = [];
var trackInputNodes = [];
var trackCompressors = [];
var trackReverbs = [];
var trackFilters = [];
var trackDelays = [];
var trackTremolos = [];

//the currently selected track (for editing effects etc.)
var activeTrack;

//json of effect data
var effects;

var buffers = []; //contains AudioBuffer and id# of samples in workspace
var times = []; //contains start times of samples and their id#
var reverbIRs = []
var pixelsPer16 = 6; 			//pixels per 16th note. used for grid snapping
var pixelsPer4 = 4*pixelsPer16;		//pixels per 1/4 note	used for sample canvas size
var bpm = tempo;
var secondsPer16 = 0.25 * 60 / bpm;

jQuery.removeFromArray = function(value, arr) {
    return jQuery.grep(arr, function(elem, index) {
        return elem.id !== value;
    });
};

var globalNumberOfTracks;
var globalWavesurfers = [];

const wavesurfer = (function () {
    'use strict';

    const createWavesurfer = function (song) {
        var startTimes = song.startTime;
        var sampleNumber = 0;
        var sampleUrl = song.url.split("/");
        var sampleTitle = sampleUrl[sampleUrl.length-1];
	var obj;
        $("#libraryList").append("<li id=librarySample" + song.id +" class=\"librarySample\" data-id="+song.id+" data-url="+song.url+" data-duration="+song.duration+"><a href=\"#\">" + sampleTitle + "</a></li>");
        $("#librarySample" + song.id).draggable({
	    revert: true,
	    helper: "clone",
	    start: function(event, ui) { $(this).css("z-index", 10); }
	});
        $.each(startTimes, function(){
	    if(sampleNumber == 0){
		obj = ({bufferURL: song.url, id: song.id, startTimes: song.startTime, track: song.track});
	    }
	    var currentStartTime = song.startTime[sampleNumber];
            var span = document.createElement('span');
            span.id = "sample" + song.id + "Span" + sampleNumber;
            const canvas = document.createElement('canvas');
	        canvas.className = "sample";
            canvas.id = "sample" + song.id + "Canvas" + sampleNumber;
            $("#track"+song.track).append(span);
            $("#sample" + song.id + "Span" + sampleNumber).append(canvas);
            $("#sample" + song.id + "Span" + sampleNumber).width(parseFloat(song.duration) * ((pixelsPer4*bpm)/60));
            canvas.width = parseFloat(song.duration) * ((pixelsPer4*bpm)/60);
            canvas.height = 80;
            $( "#sample" + song.id + "Span" + sampleNumber).attr('data-startTime',song.startTime[sampleNumber]);
            $( "#sample" + song.id + "Span" + sampleNumber).css('left',"" + parseInt(currentStartTime*pixelsPer16) + "px");
	    $( "#sample" + song.id + "Span" + sampleNumber).css('position','absolute');
            $( "#sample" + song.id + "Span" + sampleNumber).draggable({
                axis: "x",
                containment: "parent",
                grid: [pixelsPer16, 0],		//grid snaps to 16th notes
                stop: function() {
		    //get rid of old entry in table
		    var currentStartBar = $(this).attr('data-startTime');
		    times[currentStartBar] = jQuery.removeFromArray(song.id, times[currentStartBar]);
                    $(this).attr('data-startTime',parseInt($(this).css('left'))/pixelsPer16);
		    var newStartTime = $(this).attr('data-startTime');
		    if(times[newStartTime] == null){
			times[newStartTime] = [{id: song.id, track: song.track}];
		    } else {
			times[newStartTime].push({id: song.id, track: song.track});
		    }
                }
            });
	    $( "#sample" + song.id + "Span" + sampleNumber ).resizable({
            helper: "ui-resizable-helper",
            handles: "e",
            grid: pixelsPer16
	    });

        var wavesurfer = Object.create(WaveSurfer);
        wavesurfer.init({
            canvas: canvas,
            waveColor: '#08c',
            progressColor: '#08c',
            loadingColor: 'purple',
            cursorColor: 'navy',
            audioContext: ac
        });
        wavesurfer.load(song.url);
	    globalWavesurfers.push(wavesurfer);
            sampleNumber++;
        });

        return obj;
    };


    var processData = function (json) {
	var numberOfTracks = parseInt(json.projectInfo.tracks);
	effects = json.projectInfo.effects;
	//create track-specific nodes
	globalNumberOfTracks = numberOfTracks;
	createNodes(numberOfTracks);

	for(var i=0;i<numberOfTracks;i++){
	   var currentTrackNumber = i+1;
	    createTrack(currentTrackNumber);
	    $.each(effects[i],function(){
		if(this.type == "Compressor"){
		    var trackCompressor = ac.createDynamicsCompressor();
		    var inputNode = trackInputNodes[currentTrackNumber];
		    var volumeNode = trackVolumeGains[currentTrackNumber];
		    inputNode.disconnect();
		    inputNode.connect(trackCompressor);
		    trackCompressor.connect(volumeNode);
		    trackCompressors[currentTrackNumber] = trackCompressor;
		}
		if(this.type == "Filter"){
		    var trackFilter = ac.createBiquadFilter();
		    var inputNode = trackInputNodes[currentTrackNumber];
		    var volumeNode = trackVolumeGains[currentTrackNumber];
		    inputNode.disconnect();
		    inputNode.connect(trackFilter);
		    trackFilter.connect(volumeNode);
		    trackFilters[currentTrackNumber] = trackFilter;
		}
	    });

	}
	//wavesurfers is array of all tracks
        var wavesurfers = json.samples.map(createWavesurfer);
	$.each(wavesurfers, function(){
	    var currentSample = this;
	    //if they are in workspace...
	    if(currentSample != undefined){
		//load the buffer
		load(currentSample.bufferURL, currentSample.id);
		//store the times
		$.each(currentSample.startTimes, function(){
		    var currentStartTime = this;
		 if(times[currentStartTime] == null){
			times[currentStartTime] = [{id: currentSample.id, track: currentSample.track}];
		    } else {
			times[currentStartTime].push({id: currentSample.id, track: currentSample.track});
		    }
		});
	    }
	});
    };



    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (this.readyState == this.DONE && this.status == 200) {
            processData(JSON.parse(this.responseText));
        }
    };
    xhr.open('GET', 'src/data/samples.txt');
    xhr.send();
}());


function load (src, id) {

    var xhr = new XMLHttpRequest();
    xhr.open('GET', src, true);
    xhr.responseType = 'arraybuffer';
    xhr.addEventListener('load', function (e) {
	ac.decodeAudioData(
	    e.target.response,
	    function (buffer) {
		buffers[id] = {buffer: buffer};
	    },
	    Error
	);
    }, false);
    xhr.send();
};



initSched({
    bufferArray: buffers,
    audioContext: ac
});


$('body').bind('playPause-event', function(e){
    schedPlay(ac.currentTime);
});

$('body').bind('stepBackward-event', function(e){
    schedStepBack(ac.currentTime);
});
$('body').bind('mute-event', function(e, trackNumber){
    muteTrack(trackNumber);
});
$('body').bind('solo-event', function(e, trackNumber){
    solo(trackNumber);
});

$('body').bind('zoomIn-event', function(e){
    timelineZoomIn();
});

$('body').bind('zoomOut-event', function(e){
    timelineZoomOut();
});

$(document).ready(function(){
    $(".effectDrag").draggable({
        revert: true,
        helper: "clone"
    });
    $("#effectSortable").sortable({
	    cancel: "canvas,input",
    });

    $("#trackEffects").droppable({
	accept: ".effectDrag",
	drop: function(event, ui){
                $("#"+ui.draggable[0].textContent).removeClass('hidden');
                if(ui.draggable[0].textContent == "Reverb"){
                $("#reverbIrSelectKnob").val(0).trigger('change');
                $("#reverbWetDryKnob").val(50).trigger('change');


                var trackReverb = createTrackReverb();
                var inputNode = trackInputNodes[activeTrack];
                var volumeNode = trackVolumeGains[activeTrack];

                inputNode.disconnect();
                inputNode.connect(trackReverb[0]);

                if (trackFilters[activeTrack] != null ) {
                    trackReverb[1].connect(trackFilters[activeTrack]);
                }else if (trackCompressors[activeTrack != null]) {
                    trackReverb[1].connect(trackCompressors[activeTrack]);
                }else if (trackTremolos[activeTrack != null]) {
                    trackReverb[1].connect(trackTremolos[activeTrack][0]);
                }else if(trackDelays[activeTrack] != null){
                    trackReverb[1].connect(trackDelays[activeTrack][0]);
                }else{
                    trackReverb[1].connect(volumeNode);
                }

                trackReverbs[activeTrack] = trackReverb;
                effects[activeTrack-1].push({
                    type: "Reverb",
                    ir:  "0",
                    wetDry: "50"
                });
                }
                if(ui.draggable[0].textContent == "Filter"){
                $("#filterCutoffKnob").val(30).trigger('change');
                $("#filterQKnob").val(1).trigger('change');
                $("#filterTypeKnob").val(0).trigger('change');
                var trackFilter = ac.createBiquadFilter();
                var inputNode = trackInputNodes[activeTrack];
                var volumeNode = trackVolumeGains[activeTrack];

                if (trackReverbs[activeTrack] != null) {
                    trackReverbs[activeTrack][1].disconnect();
                    trackReverbs[activeTrack][1].connect(trackFilter);
                }else {
                    inputNode.disconnect();
                    inputNode.connect(trackFilter);
                }

                if (trackCompressors[activeTrack] != null){
                    trackFilter.connect(trackCompressors[activeTrack]);
                }else if (trackTremolos[activeTrack != null]) {
                    trackFilter.connect(trackTremolos[activeTrack][0]);
                }else if(trackDelays[activeTrack] != null){
                    trackFilter.connect(trackDelays[activeTrack][0]);
                }else{
                    trackFilter.connect(volumeNode);
                }

                trackFilters[activeTrack] = trackFilter;
                effects[activeTrack-1].push({
                    type: "Filter",
                    cutoff: "30",
                    q: "1",
                    filterType: "0"
                });
                }
                if(ui.draggable[0].textContent == "Compressor"){
                $("#compressorThresholdKnob").val(-24).trigger('change');
                $("#compressorRatioKnob").val(12).trigger('change');
                $("#compressorAttackKnob").val(3).trigger('change');
                var trackCompressor = ac.createDynamicsCompressor();
                var inputNode = trackInputNodes[activeTrack];
                var volumeNode = trackVolumeGains[activeTrack];

                if (trackFilters[activeTrack] != null){
                    trackFilters[activeTrack].disconnect();
                    trackFilters[activeTrack].connect(trackCompressor);
                }else if (trackReverbs[activeTrack] != null) {
                    trackReverbs[activeTrack][1].disconnect();
                    trackReverbs[activeTrack][1].connect(trackCompressor);
                }else {
                    inputNode.disconnect();
                    inputNode.connect(trackCompressor);
                }

                 if (trackTremolos[activeTrack != null]) {
                    trackCompressor.connect(trackTremolos[activeTrack][0]);
                }else if (trackDelays[activeTrack] != null) {
                    trackCompressor.connect(trackDelays[activeTrack][0]);
                }else{
                    trackCompressor.connect(volumeNode);
                }

                trackCompressors[activeTrack] = trackCompressor;
                effects[activeTrack-1].push({
                    type: "Compressor",
                    threshold: "-24",
                    ratio: "12",
                    attack: ".003"
                });
                //console.log(effects[activeTrack-1]);
                }
                if(ui.draggable[0].textContent == "Tremolo"){

                $("#tremoloRateKnob").val(1).trigger('change');
                $("#tremoloDepthKnob").val(10).trigger('change');
                var trackTremolo = createTrackTremolo();
                var inputNode = trackInputNodes[activeTrack];
                var volumeNode = trackVolumeGains[activeTrack];

                if (trackCompressors[activeTrack] != null){
                    trackCompressors[activeTrack].disconnect();
                    trackCompressors[activeTrack].connect(trackTremolo[0]);
                }else if(trackFilters[activeTrack] != null) {
                    trackFilters[activeTrack].disconnect();
                    trackFilters[activeTrack].connect(trackTremolo[0]);
                }else if (trackReverbs[activeTrack] != null) {
                    trackReverbs[activeTrack][1].disconnect();
                    trackReverbs[activeTrack][1].connect(trackTremolo[0]);
                }else {
                    inputNode.disconnect();
                    inputNode.connect(trackTremolo[0]);
                }

                if (trackDelays[activeTrack] != null) {
                    trackTremolo[1].connect(trackDelays[activeTrack][0]);
                }else{
                    trackTremolo[1].connect(volumeNode);
                }

                trackTremolos[activeTrack] = trackTremolo;
                effects[activeTrack-1].push({
                    type: "Tremolo",
                    rate: "1",
                    depth: "10"
                });
                //console.log(effects[activeTrack-1]);
                }
                if(ui.draggable[0].textContent == "Delay"){
                $("#delayTimeKnob").val(1).trigger('change');
                $("#delayFeedbackKnob").val(20).trigger('change');
                $("#delayWetDryKnob").val(50).trigger('change');
                var trackDelay = createTrackDelay();
                var inputNode = trackInputNodes[activeTrack];
                var volumeNode = trackVolumeGains[activeTrack];

                if (trackFilters[activeTrack] != null){
                    trackFilters[activeTrack].disconnect();
                    trackFilters[activeTrack].connect(trackDelay[0]);
                }else if (trackReverbs[activeTrack] != null) {
                    trackReverbs[activeTrack][1].disconnect();
                    trackReverbs[activeTrack][1].connect(trackDelay[0]);
                }else if(trackCompressors[activeTrack] != null) {
                    trackCompressors[activeTrack].disconnect();
                    trackCompressors[activeTrack].connect(trackDelay[0]);
                }else if(trackTremolos[activeTrack] != null) {
                    trackTremolos[activeTrack][1].disconnect();
                    trackTremolos[activeTrack][1].connect(trackDelay[0]);
                }else{
                    inputNode.disconnect();
                    inputNode.connect(trackDelay[0]);
                }

                trackDelay[1].connect(volumeNode);

                trackDelays[activeTrack] = trackDelay;
                effects[activeTrack-1].push({
                    type: "Delay",
                    time: "1",
                    feedback: "20",
                    wetDry: "50"
                });
                }




            }

    });



    $("#compressorThresholdKnob").knob({
	change : function(v) {
	    setCompressorThresholdValue(activeTrack,v);
	    $.each(effects[activeTrack-1], function(){
		if(this.type == "Compressor"){
		    this.threshold = v;
		}
	    });
	}
    });
    $("#compressorRatioKnob").knob({
	change : function(v) {
	    setCompressorRatioValue(activeTrack,v);
	    $.each(effects[activeTrack-1], function(){
		if(this.type == "Compressor"){
		    this.ratio = v;
		}
	    });
	}
    });
    $("#compressorAttackKnob").knob({
	change : function(v) {
	    setCompressorAttackValue(activeTrack,v);
	    $.each(effects[activeTrack-1], function(){
		if(this.type == "Compressor"){
		    this.attack = v/1000;
		}
	    });
	}
    });

    $("#filterCutoffKnob").knob({
	change : function(v) {
	    setFilterCutoffValue(activeTrack,v);
	    $.each(effects[activeTrack-1], function(){
		if(this.type == "Filter"){
		    this.cutoff = v;
		}
	    });
	}
    });
    $("#filterQKnob").knob({
	change : function(v) {
	    setFilterQValue(activeTrack,v);
	    $.each(effects[activeTrack-1], function(){
		if(this.type == "Filter"){
		    this.q = v;
		}
	    });
	}
    });
    $("#filterTypeKnob").knob({
	change : function(v) {
	    setFilterType(activeTrack,v);
	    $.each(effects[activeTrack-1], function(){
		if(this.type == "Filter"){
		    this.filterType = v;
		}
	    });
	}
    });

    $("#reverbWetDryKnob").knob({
	change : function(v) {
	    setReverbWetDryValue(activeTrack,v);
	    $.each(effects[activeTrack-1], function(){
		if(this.type == "Reverb"){
		    this.wetDry = v;
		}
	    });
	}
    });
      $("#reverbIrSelectKnob").knob({
	change : function(v) {
	    setReverbIr(activeTrack,v);
	    $.each(effects[activeTrack-1], function(){
		if(this.type == "Reverb"){
		    this.ir = v;
		}
	    });
	}
    });

    //$("#reverbList").onchange= setReverbIR()

    $("#delayTimeKnob").knob({
	change : function(v) {
	    setDelayTimeValue(activeTrack,v);
	    $.each(effects[activeTrack-1], function(){
		if(this.type == "Delay"){
		    this.time = v;
		}
	    });
	}
    });
    $("#delayFeedbackKnob").knob({
	change : function(v) {
	    setDelayFeedbackValue(activeTrack,v);
	    $.each(effects[activeTrack-1], function(){
		if(this.type == "Delay"){
		    this.feedback = v;
		}
	    });
	}
    });
    $("#delayWetDryKnob").knob({
	change : function(v) {
	    setDelayWetDryValue(activeTrack,v);
	    $.each(effects[activeTrack-1], function(){
		if(this.type == "Delay"){
		    this.wetDry = v;
		}
	    });
	}
    });

   DAW.setupUIEvents();

   DAW.drawTimeline();

});



function createNodes(numTracks) {
    //for each track create a master gain node. specific tracks represented by array index i
    for (var i = 1; i <= numTracks; i++) {
        var trackMasterGainNode = ac.createGain();
        var trackInputNode = ac.createGain();
        var trackVolumeNode = ac.createGain();

        trackMasterGainNode.connect(masterGainNode);
        trackVolumeNode.connect(trackMasterGainNode);
        trackInputNode.connect(trackVolumeNode);

        trackMasterGains[i] = {node: trackMasterGainNode, isMuted: false, isSolo: false};
        trackVolumeGains[i] = trackVolumeNode;
        trackInputNodes[i] = trackInputNode;
    }
}

function startUserMedia(stream) {
    micStream = stream;
}

window.onload = function init() {
    try {
      // webkit shim
      navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
      window.URL = window.URL || window.webkitURL;

    } catch (e) {
      alert('No web audio support in this browser!');
    }

    navigator.getUserMedia({audio: true}, startUserMedia, function(e) {
    });
};

