const DAW = {
    activeRecorder: null,
    tracks: [],  //type: Track
    stop: null,      //replaced in scheduler
    fakeRecordingCount: 2000,       //TODO: remove this ugly hack
};