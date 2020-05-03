const createTrack = function(trackNumber, effects) {
          console.log('##in create track');

          if(null == trackNumber){
             trackNumber = 0;
          }
          if(null == effects){
            effects = [];
          }

          DAW.tracks[trackNumber] = {
            recording: false,
            canvas: null
          };

           let html = "";
           html+= "<div class=\"row-fluid\" id=\"selectTrack"+trackNumber+"\">";
           html+= "     <div class=\"span2 trackBox\" style=\"height: 84px;\">";
           html+= "         <p style=\"margin: 0 0 0 0;\" id=\"track"+trackNumber+"title\">Track"+trackNumber+"</p>";
           html+= "         <div style=\"margin: 5px 0 5px 0;\" id=\"volumeSlider"+trackNumber+"\"></div>";
           html+= "         <div class=\"btn-toolbar\" style=\"margin-top: 0px;\">";
           html+= "         <div class=\"btn-group\">";
           html+= "             <button type=\"button\" class=\"btn btn-mini\" id = \"solo"+trackNumber+"\">";
           html+= "                 <i class=\"icon-headphones\"></i>";
           html+= "             </button>";
           html+= "             <button type=\"button\" class=\"btn btn-mini\" id = \"mute"+trackNumber+"\">";
           html+= "                 <i class=\"icon-volume-off\"></i>";
           html+= "             </button>";
           html+= "         </div>";
           html+= "         <div class=\"btn-group\">";
           html+= "             <button type=\"button\" class=\"btn btn-mini\" data-toggle=\"button\" id =\"record"+trackNumber+"\">";
           html+= "                 <i style='color:red;' title='record'>R</i>";
           html+= "             </button>";
           html+= "         </div>";
           html+= "     </div>";
           html+= " </div>";
           html+= " <div id=\"track"+trackNumber+"\" class=\"span10 track\"></div>";
           html+= " </div>";

          $("#tracks").append(html);
          if(effects[trackNumber-1] == null){
      	    effects[trackNumber-1] = [];
          }

          setUIControls(trackNumber);




      function setUIControls(trackNumber)
      {
        $("#volumeSlider"+trackNumber).slider({
                value: 80,
                orientation: "horizontal",
                range: "min",
                min: 0,
                max: 100,
                animate: true,
                slide: function(event, ui) {
                    setTrackVolume(trackNumber, ui.value);
                }
          });

          $("#selectTrack"+trackNumber).click(function(){
                var printTrackNumber = $(this).attr('id').split('selectTrack')[1];
                activeTrack = printTrackNumber;
                //compensation for off by one (track1 = effects[0])
                $(".effect").addClass("hidden");
                $.each(effects[activeTrack-1], function(){
                    var currentEffect = this;
                    $("#"+currentEffect.type).removeClass("hidden");
                    if(currentEffect.type == "Compressor"){
                    $("#compressorThresholdKnob").val(currentEffect.threshold).trigger('change');
                    $("#compressorRatioKnob").val(currentEffect.ratio).trigger('change');
                    $("#compressorAttackKnob").val(currentEffect.attack*1000).trigger('change');
                    }
                    if(currentEffect.type == "Filter"){
                          $("#filterCutoffKnob").val(currentEffect.cutoff).trigger('change');
                          $("#filterQKnob").val(currentEffect.q).trigger('change');
                          $("#filterTypeKnob").val(currentEffect.filterType).trigger('change');
                    }
                    if(currentEffect.type == "Reverb"){
                          $("#reverbWetDryKnob").val(currentEffect.wetDry);
                          $("#reverbIrSelectKnob").val(currentEffect.ir);

                    }
                    if(currentEffect.type == "Delay"){
                        $("#delayTimeKnob").val(currentEffect.time);
                        $("#delayFeedbackKnob").val(currentEffect.feedback);
                        $("#delayWetDryKnob").val(currentEffect.wetDry);
                    }
                    if(currentEffect.type == "Tremelo"){
                          $("#tremeloRateKnob").val(currentEffect.rate).trigger('change');
                          $("#tremeloDepthKnob").val(currentEffect.depth).trigger('change');
                    }
                });
                Object.keys(effects[activeTrack-1]);
                $("#trackEffectsHeader").html("Track "+printTrackNumber);
                $("#trackEffects").css("display","block");
                $("#masterControl").css("display","block");
          });

          $("#mute"+trackNumber).click(function(){
                $(this).button('toggle');
                var muteTrackNumber = $(this).attr('id').split('mute')[1];
                $('body').trigger('mute-event', muteTrackNumber);
          });
           $("#solo"+trackNumber).click(function(){
                $(this).button('toggle');
                var soloTrackNumber = $(this).attr('id').split('solo')[1];
                $('body').trigger('solo-event', soloTrackNumber);
          });

          $("#record"+trackNumber).click(function(){
              recordTrack($(this));
            });


            $("#track"+trackNumber+"title").storage({
                storageKey : 'track'+trackNumber
            });

            $( "#track"+trackNumber ).droppable({
                accept: ".librarySample",
                drop: function( event, ui ) {
                    var startBar = Math.floor((ui.offset.left-$(this).offset().left)/6);
                    var sampleStartTime = startBar;
                    var rand = parseInt(Math.random() * 10000);
                    var span = document.createElement('span');
                    var sampleID = ui.helper.attr("data-id");
                    var sampleDuration = ui.helper.attr("data-duration");
                    var sampleURL = ui.helper.attr("data-url");
                    span.id = "sample" + sampleID + "Span" + rand;

                    const canvas = document.createElement('canvas');
                    canvas.className = "sample";
                    canvas.id = "sample" + sampleID + "Canvas" + rand;
                    $(this).append(span);
                    $("#sample" + sampleID + "Span" + rand).append(canvas);
                    $("#sample" + sampleID + "Span" + rand).width(parseFloat(sampleDuration) * ((pixelsPer4*bpm)/60));
                    canvas.width = parseFloat(sampleDuration) * ((pixelsPer4*bpm)/60);
                    canvas.height = 80;
                    $( "#sample" + sampleID + "Span" + rand).attr('data-startTime',startBar);
                    $( "#sample" + sampleID + "Span" + rand).css('left',"" + startBar*pixelsPer16 + "px");
                    $( "#sample" + sampleID + "Span" + rand).css('position','absolute');
                    $( "#sample" + sampleID + "Span" + rand).draggable({
                    axis: "x",
                    containment: "parent",
                    grid: [pixelsPer16, 0],		//grid snaps to 16th notes
                    stop: function() {
                        var currentStartBar = $(this).attr('data-startTime');
                        times[currentStartBar] = jQuery.removeFromArray(sampleID, times[currentStartBar]);
                        $(this).attr('data-startTime',parseInt($(this).css('left'))/pixelsPer16);
                        var newStartTime = $(this).attr('data-startTime');
                        if(times[newStartTime] == null){
                        times[newStartTime] = [{id: sampleID, track: trackNumber}];
                        } else {
                        times[newStartTime].push({id: sampleID, track: trackNumber});
                        }
                    }
                });

                var wavesurfer = Object.create(WaveSurfer);
                    wavesurfer.init({
                    canvas: DAW.tracks[trackNumber].canvas,
                    waveColor: 'violet',
                    progressColor: 'purple',
                    loadingColor: 'purple',
                    cursorColor: 'navy',
                    audioContext: ac
                    });
                    wavesurfer.load(sampleURL);
                    globalWavesurfers.push(wavesurfer);
                    if(buffers[sampleID]==undefined){
                    load(sampleURL, sampleID);
                    }
                    if(times[sampleStartTime] == null){
                    times[sampleStartTime] = [{id: sampleID, track: trackNumber}];
                    } else {
                    times[sampleStartTime].push({id: sampleID, track: trackNumber});
                    }
                }
                });
      }


      function recordTrack($jQDomElem)
        {
            var trackNumber = $jQDomElem.attr('id').split('record')[1];
            $jQDomElem.button('toggle');

            if (!DAW.tracks[trackNumber].recording)
            {
                //Start Recording
                console.log('##start recording');
                DAW.tracks[trackNumber].recording = true;

                var input = ac.createMediaStreamSource(micStream);
                //input.connect(ac.destination);
                DAW.activeRecorder = new Recorder(input);
                DAW.activeRecorder.record();
                schedPlay(ac.currentTime);
            }
            else {
                stopRecordingTrack(trackNumber);
            }
        }

        function stopRecordingTrack(recordTrackNumber) {
            //Stop Recording
            console.log('##stop recordiing');
            DAW.tracks[recordTrackNumber].recording = false;
            DAW.activeRecorder.stop();
            DAW.stop();

            var recordingDuration;

            var startBar;
            if(pauseBeat==undefined){
                startBar = 0;
            } else {
                startBar = pauseBeat;
            }

            DAW.activeRecorder.getBuffer(function(recordingBuffer){
                recordingDuration = recordingBuffer[0].length/ac.sampleRate;

                var newBuffer = ac.createBuffer( 2, recordingBuffer[0].length, ac.sampleRate );
                //var newSource = ac.createBufferSourceNode();
                newBuffer.getChannelData(0).set(recordingBuffer[0]);
                newBuffer.getChannelData(1).set(recordingBuffer[1]);
                //newSource.buffer = newBuffer;

                const span = document.createElement('span');
                span.id = "recording" + DAW.fakeRecordingCount + "Span";
                $("#track"+recordTrackNumber).append(span);

                DAW.tracks[trackNumber].canvas = document.createElement('canvas');
                DAW.tracks[trackNumber].canvas.className = "sample";
                DAW.tracks[trackNumber].canvas.id = "recording" + DAW.fakeRecordingCount + "Canvas";

                const $jQSpan = $("#recording" + DAW.fakeRecordingCount + "Span");
                $jQSpan.append(DAW.tracks[trackNumber].canvas);
                $jQSpan.width(parseFloat(recordingDuration) * ((pixelsPer4*bpm)/60));
                $jQSpan.attr('data-startTime',startBar);
                $jQSpan.css('left',"" + startBar*pixelsPer16 + "px");
                $jQSpan.css('position','absolute');
                $jQSpan.draggable({
                    axis: "x",
                    containment: "parent",
                    grid: [pixelsPer16, 0],		//grid snaps to 16th notes
                    stop: function() {
                    //get rid of old entry in table
                    var currentRecordingCount = parseInt($(this).attr('id').split('recording')[1]);
                    var currentStartBar = $(this).attr('data-startTime');
                    times[currentStartBar] = jQuery.removeFromArray(currentRecordingCount, times[currentStartBar]);
                    $(this).attr('data-startTime',parseInt($(this).css('left'))/pixelsPer16);
                    var newStartTime = $(this).attr('data-startTime');
                    if(times[newStartTime] == null){
                        times[newStartTime] = [{id: currentRecordingCount, track: recordTrackNumber}];
                    } else {
                        times[newStartTime].push({id: currentRecordingCount, track: recordTrackNumber});
                    }
                    console.log("Old Start Time: "+ currentStartBar);
                    console.log("New Start Time: "+ newStartTime);
                    }
                });
                DAW.tracks[trackNumber].canvas.width = parseFloat(recordingDuration) * ((pixelsPer4*bpm)/60);
                DAW.tracks[trackNumber].canvas.height = 80;

                manageWavExport(newBuffer, startBar, recordTrackNumber);
            });
        }

        function manageWavExport(newBuffer, startBar, recordTrackNumber)
        {
            DAW.activeRecorder.exportWAV(function(blob){
                var url = URL.createObjectURL(blob);
                var wavesurfer = Object.create(WaveSurfer);
                wavesurfer.init({
                canvas: DAW.tracks[recordTrackNumber].canvas,
                waveColor: '#08c',
                progressColor: '#08c',
                loadingColor: 'purple',
                cursorColor: 'navy',
                audioContext: ac
                });
                wavesurfer.load(url);
                globalWavesurfers.push(wavesurfer);
                buffers[DAW.fakeRecordingCount] = {buffer: newBuffer};

                if (times[startBar] == null)
                {
                    times[startBar] = [{id: DAW.fakeRecordingCount, track: recordTrackNumber}];
                }
                else
                {
                    times[startBar].push({id: DAW.fakeRecordingCount, track: recordTrackNumber});
                }
                DAW.fakeRecordingCount++;
            });
        }

      }