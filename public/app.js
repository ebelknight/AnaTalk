document.addEventListener('DOMContentLoaded', () => {
    const startCallButton = document.getElementById('startCall');
    const hangUpButton = document.getElementById('hangUp');
    const acceptCallButton = document.getElementById('acceptCall');
    const socket = io.connect(window.location.origin);
    const audioElement = document.createElement('audio');
    // audioElement.autoplay = true;
    document.body.appendChild(audioElement);
    let peerConnection;
    const configuration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    startCallButton.onclick = () => startCall();
    hangUpButton.onclick = () => hangUp();
    acceptCallButton.onclick = () => acceptCall();
    socket.on('connect', () => {
        console.log('Socket connected:', socket.id); // This will log the socket's ID
    });
    socket.on('message', (message) => {
        console.log('Received message:', message.type, message);
        if (message.type === 'offer') {
            showAcceptCallButton();
            sessionStorage.setItem('remoteOffer', JSON.stringify(message.offer));
        } else if (message.type === 'answer') {
            peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
        } else if (message.type === 'new-ice-candidate') {
            peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
    });

    function startCall() {
        console.log('Starting call');
        preparePeerConnection();
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(stream => {
                stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
                console.log('Accessed Media');
    
                // Create an offer
                peerConnection.createOffer().then(offer => {
                    // Set the offer as the local description
                    return peerConnection.setLocalDescription(offer);
                }).then(() => {
                    // Send the offer to the remote peer using the signaling server
                    console.log('Sending offer to remote peer');
                    socket.emit('message', { type: 'offer', offer: peerConnection.localDescription });
                }).catch(error => console.error('Error creating or sending offer:', error));
            }).catch(error => console.error('Media access error:', error));
    
        setupCallButton(true);
        console.log('StartCall executed');
    }
    
    function acceptCall() {
        console.log('Accepting call');
        const offer = JSON.parse(sessionStorage.getItem('remoteOffer'));
        preparePeerConnection();
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(stream => {
                stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
                peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
                    .then(() => peerConnection.createAnswer())
                    .then(answer => peerConnection.setLocalDescription(answer))
                    .then(() => {
                        console.log('Sending message:', message.type, message);
                        socket.emit('message', { type: 'answer', answer: peerConnection.localDescription });
                        acceptCallButton.style.display = 'none'; // Hide the accept call button after accepting
                    });
            }).catch(error => console.error('Error accessing media devices:', error));

        setupCallButton(true);
    }
    function preparePeerConnection() {
        console.log('Preparing peer connection hahaha');
        try {
            peerConnection = new RTCPeerConnection(configuration);
        } catch (error) {
            console.error('Failed to create peer connection:', error);
        }
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                console.log('Sending ICE candidate', event.candidate);
                socket.emit('message', { type: 'new-ice-candidate', candidate: event.candidate });
            }
        };

        peerConnection.ontrack = event => {
            const [remoteStream] = event.streams;
            const audioElement = document.createElement('audio');
            audioElement.srcObject = remoteStream;
            audioElement.autoplay = true;
            document.body.appendChild(audioElement);
        };

        peerConnection.oniceconnectionstatechange = event => {
            if (peerConnection.iceConnectionState === 'disconnected') {
                hangUp();
            }
        };
    }

    function hangUp() {
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
            setupCallButton(false);
        }
    }

    function setupCallButton(isInCall) {
        startCallButton.disabled = isInCall;
        hangUpButton.disabled = !isInCall;
    }
    function showAcceptCallButton() {
        console.log('Showing accept call button');
        acceptCallButton.style.display = 'inline'; // Show the accept call button when an offer is received
    }
});
