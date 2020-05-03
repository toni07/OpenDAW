DAW.setupUIEvents = function()
{
    $("#tremoloRateKnob").knob({
        change : function(v) {
            setTremoloRateValue(activeTrack,v);
            $.each(effects[activeTrack-1], function(){
            if(this.type == "Tremolo"){
                this.rate = v;
            }
            });
        }
    });

    $("#tremoloDepthKnob").knob({
        change : function(v) {
            setTremoloDepthValue(activeTrack,v);
            $.each(effects[activeTrack-1], function(){
            if(this.type == "Tremolo"){
                this.depth = v;
            }
            });
        }
    });

    $(".dial").knob();

    $("#playPause").click(function(){
        $('body').trigger('playPause-event');
    });

    $("#step-backward").click(function(){
        $('body').trigger('stepBackward-event');
    });
    $("#zoomIn").click(function(){
        $('body').trigger('zoomIn-event');
        var WavesurferCanvases = $(".sample");
        $.each(WavesurferCanvases,function(){
            var wavesurferCanvas = this;
            var oldWidth = wavesurferCanvas.width;
            var newWidth = oldWidth*2;
            wavesurferCanvas.width = newWidth;
            $($(wavesurferCanvas).parent()[0]).css("width",newWidth+"px");
            var oldLeft = parseInt($($(wavesurferCanvas).parent()[0]).css("left"));
            $($(wavesurferCanvas).parent()[0]).css("left",""+oldLeft*2+"px");
        });
        $.each(globalWavesurfers, function(){
            var wavesurfer = this;
            wavesurfer.drawer.clear();
            wavesurfer.drawer.width  = wavesurfer.drawer.width*2;
            wavesurfer.drawer.drawBuffer(wavesurfer.backend.currentBuffer);
        });
    });

    $("#zoomOut").click(function(){
        $('body').trigger('zoomOut-event');
        const WavesurferCanvases = $(".sample");
        $.each(WavesurferCanvases,function(){
            const wavesurferCanvas = this;
            const oldWidth = wavesurferCanvas.width;
            wavesurferCanvas.width = oldWidth/2 + 1;
            $($(wavesurferCanvas).parent()[0]).css("width",oldWidth/2 + 1+"px");
            var oldLeft = parseInt($($(wavesurferCanvas).parent()[0]).css("left"));
            $($(wavesurferCanvas).parent()[0]).css("left",""+oldLeft/2+"px");
        });
        $.each(globalWavesurfers, function(){
            const wavesurfer = this;
            wavesurfer.drawer.clear();
            wavesurfer.drawer.width = wavesurfer.drawer.width/2 + 1;
            wavesurfer.drawer.drawBuffer(wavesurfer.backend.currentBuffer);
        });
    });

    $("#trackEffectsClose").click(function(){
        $("#trackEffects").css("display","none");
        $("#masterControl").css("display","none");
    });


    $( "#masterVolume" ).slider({
      orientation: "vertical",
      range: "min",
      min: 0,
      max: 100,
      value: 80,
      slide: function( event, ui ) {
        setMasterVolume(ui.value);
      }
    });

    $("#addTrackButton").click(function(){
    	var newTrackNumber = globalNumberOfTracks+1;
    	globalNumberOfTracks++;
    	if(globalNumberOfTracks>4){
    	    var currentSideBarHeight = parseInt($(".sidebar").css('height'));
    	    currentSideBarHeight+=90;
    	    $(".sidebar").css('height',""+currentSideBarHeight+"px");
    	}
    	createTrack(newTrackNumber);
    	var trackMasterGainNode = ac.createGain();
    	var trackInputNode = ac.createGain();
    	var trackVolumeNode = ac.createGain();

    	trackMasterGainNode.connect(masterGainNode);
    	trackVolumeNode.connect(trackMasterGainNode);
    	trackInputNode.connect(trackVolumeNode);

    	trackMasterGains[newTrackNumber] = {node: trackMasterGainNode, isMuted: false, isSolo: false};
    	trackVolumeGains[newTrackNumber] = trackVolumeNode;
    	trackInputNodes[newTrackNumber] = trackInputNode;
    });
}