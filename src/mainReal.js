const DAW = {
    activeRecorder: null,
    tracks: [],  //type: Track
    stop: null,      //replaced in scheduler
    drawTimeline: null,     //replaced in scheduler
    timelineCanvas: null,   //replaced in scheduler
    timelineCanvasContext: null,   //replaced in scheduler
    timelineWidth: 0,   //replaced in scheduler
    fakeRecordingCount: 2000,       //TODO: remove this ugly hack
};