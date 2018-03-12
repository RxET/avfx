let visualizer;

$(document).ready(function () {
    visualizer = new AudioVisualizer();
    visualizer.initialize();
    visualizer.createBars();
    visualizer.createParticles();
    visualizer.setupAudioProcessing();
    visualizer.getAudio();
    visualizer.handleDrop();
    visualizer.cameraFly();
});

// window.onload = function () {
//     visualizer.particleAnimate();
// }

function AudioVisualizer() {
    //constants
    this.numberOfBars = 60;
    this.numberOfParticles = 1000;

    //Rendering
    this.scene;
    this.camera;
    this.renderer;
    this.controls;

    //bars
    this.bars = new Array();
    this.particles = new Array();

    //audio
    this.javascriptNode;
    this.audioContext;
    this.sourceBuffer;
    this.analyser;
}

//initialize visualizer - window, lights, camera
AudioVisualizer.prototype.initialize = function () {
    this.scene = new THREE.Scene();

    const WIDTH = window.innerWidth - 20 ;
        HEIGHT = window.innerHeight - 20 ;

    //get the renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(WIDTH, HEIGHT);

    //append the renderer to the canvas
    document.getElementById('canvas').appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(40, WIDTH / HEIGHT, 0.1, 20000);
    this.camera.position.set(0, 90, 0);
    this.scene.add(this.camera);

    const that = this;

    //update on resize
    window.addEventListener('resize', function () {

        const WIDTH = window.innerWidth - 20,
            HEIGHT = window.innerHeight - 20;

        that.renderer.setSize(WIDTH, HEIGHT);

        that.camera.aspect = WIDTH / HEIGHT;
        that.camera.updateProjectionMatrix();
    });

    this.renderer.setClearColor(0x000000, 0.0);
    //clear background - renderer alpha is set to true for gradient background

    const light = new THREE.SpotLight(0xffffff, 1);
    light.position.set(100, 140, 130)

    const ambLight = new THREE.AmbientLight(0xffffff, 0.5);
    light.position.set(-100, 500, 750);

    this.scene.add(light, ambLight);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
};

//create the bars
AudioVisualizer.prototype.createBars = function () {

    for (let i = 0; i < this.numberOfBars; i++) {
        const barGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.01);

        const material = new THREE.MeshPhongMaterial({
            color: this.getGradientColor(i),
            specular: 0xffffff,
            emissive: 0x0
        });

        this.bars[i] = new THREE.Mesh(barGeometry, material);
        this.bars[i].position.set(i - this.numberOfBars / 2, 0, 0);
        this.scene.add(this.bars[i]);
    }
};

AudioVisualizer.prototype.createParticles = function () {
    // const particle = new THREE.Object3D();

    for (let i=0; i<this.numberOfParticles; i++) {
        const particleGeometry = new THREE.TetrahedronGeometry(2, 0);
        const material = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            flatShading: true
          });

        this.particles[i] = new THREE.Mesh(particleGeometry, material);
        this.particles[i].position.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        this.particles[i].position.multiplyScalar(180 + (Math.random() * 250));
        this.particles[i].rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
        this.scene.add(this.particles[i]);
    }
}

// AudioVisualizer.prototype.particleAnimate = function() {
//     requestAnimationFrame(this.particleAnimate);
//     let that = this;
//     for (let i=0; i<this.numberOfParticles; i++) {
//     that.particles[i].rotation.x += 0.0011;
//     that.particles[i].rotation.y -= 0.0040;
//     that.renderer.clear();

//     that.renderer.render( visualizer.scene, visualizer.camera )
//     }
// }

AudioVisualizer.prototype.setupAudioProcessing = function () {
    //audio context
    this.audioContext = new AudioContext();

    // this.context = new AudioContext();
    // let noiseWorker = this.context.createAudioWorker()
    // let noiseWorker = this.audioContext.createAudioWorker()
    // console.log('noiseWorker', noiseWorker);

    //create javascript node
    this.javascriptNode = this.audioContext.createScriptProcessor(2048, 1, 1);
    this.javascriptNode.connect(this.audioContext.destination);

    //create source buffer
    this.sourceBuffer = this.audioContext.createBufferSource();

    //create analyser node
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.smoothingTimeConstant = 0.01;
    this.analyser.fftSize = 512;

    //connect source to analyser
    this.sourceBuffer.connect(this.analyser);

    //analyser to speakers
    this.analyser.connect(this.javascriptNode);

    //connect source to audioContext
    this.sourceBuffer.connect(this.audioContext.destination);

    const that = this;

    //animate the bars
    this.javascriptNode.onaudioprocess = function () {

        // get the average for the first channel
        const array = new Uint8Array(that.analyser.frequencyBinCount);
        that.analyser.getByteFrequencyData(array);

        //render the scene and update controls
        visualizer.renderer.render(visualizer.scene, visualizer.camera);
        visualizer.controls.update();

        const step = Math.round(array.length / visualizer.numberOfBars);
        const partSteps = Math.round(array.length / visualizer.numberOfParticles);


        for(let h=0; h<visualizer.numberOfParticles; h++) {
            let upOrDown = false;
            let value = array[h * partSteps] / 100;
            value = value < 1 ? 1 : value;
            //scale on heavy beats
            visualizer.particles[h].scale.x = value
            visualizer.particles[h].scale.y = value
            visualizer.particles[h].scale.z = value

            //constant rotation
            visualizer.particles[h].rotation.x += 0.011
            visualizer.particles[h].rotation.y += 0.040
            visualizer.particles[h].rotation.z += 0.025
        }

        //Iterate through bars and scale the axes
        for (let i = 0; i < visualizer.numberOfBars; i++) {
            let value = array[i * step] / 0.05;
            value = value < 1 ? 1 : value;
            visualizer.bars[i].scale.z = value;
        }

        for (let j = 0; j < visualizer.numberOfBars; j++) {
            let value = array[j * step] / 0.5;
            value = value < 1 ? 1 : value;
            visualizer.bars[j].scale.y = value;
        }

        for (let k = 0; k < visualizer.numberOfBars; k++) {
            let value = array[k * step] / 2;
            value = value < 1 ? 1 : value;
            visualizer.bars[k].scale.x = value;
        }
    }
};

//get the default audio from the server
AudioVisualizer.prototype.getAudio = function () {
    const request = new XMLHttpRequest();
    request.open('GET', '/assets/Karaoke Mouse Shanghai Reggae DJ Sides Alternate Take.mp3', true);
    request.responseType = 'arraybuffer';
    request.send();
    let that = this;
    request.onload = function () {
        that.start(request.response);
    }
    // $('#guide').text('Playing ' + 'Karaoke Mouse Shanghai Reggae DJ Sides Alternate Take.mp3');
};

//start the audio processing
AudioVisualizer.prototype.start = function (buffer) {
    this.audioContext = new AudioContext();
    this.audioContext.decodeAudioData(buffer, decodeAudioDataSuccess, decodeAudioDataFailed);
    let that = this;

    function decodeAudioDataSuccess(decodedBuffer) {
        that.sourceBuffer.buffer = decodedBuffer
        that.sourceBuffer.loop = false;
        that.sourceBuffer.start(0);
    }

    function decodeAudioDataFailed() {
        debugger;
    }
};

AudioVisualizer.prototype.stop = function () {
    // console.log(this.sourceBuffer);
    this.audioContext.close();
    // this.sourceBuffer.buffer.stop(0);
    // this.audioContext = new AudioContext();
    // this.sourceBuffer.buffer = null;
};

//set the gradient with two hex values
// consider plugins to change these values dynamically
AudioVisualizer.prototype.getGradientColor = function (current) {
    const gradient = jsgradient.generateGradient('#11E8BB', '#8200C9', this.numberOfBars);
    return gradient[current];
};

AudioVisualizer.prototype.handleDrop = function () {
    let that = this;
    //drag Enter
    document.body.addEventListener('dragenter', function () {
        // visualizer.stop();
    }, false);

    //drag over
    document.body.addEventListener('dragover', function (e) {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }, false);

    //drag leave
    document.body.addEventListener('dragleave', function () {
    }, false);

    //drop
    document.body.addEventListener('drop', function (e) {
        e.stopPropagation();
        e.preventDefault();

        //get the file
        let file = e.dataTransfer.files[0];
        let fileName = file.name;

        $('#guide').text('Playing ' + fileName);

        let fileReader = new FileReader();

        fileReader.onload = function (e) {
            let fileResult = e.target.result;
            visualizer.start(fileResult);
        };

        fileReader.onerror = function (e) {
            debugger
        };

        fileReader.readAsArrayBuffer(file);
    }, false);
}

AudioVisualizer.prototype.cameraFly = function(event) {
    document.addEventListener( 'keydown', onDocumentKeyPress, false );
    let that = this;
    // left arrow	37
    // right arrow	39

    function onDocumentKeyPress( event ) {
        var keyCode = event.which;
        //up
        if (keyCode == 38) {
            that.camera.fov *= .99;
            // that.camera.zoom += 0.01;
            that.camera.updateProjectionMatrix();
        }
        //down
        else if (keyCode == 40) {
            that.camera.fov *= 1.01;
            // that.camera.zoom -= 0.01;
            that.camera.updateProjectionMatrix();
        }
    }
}

