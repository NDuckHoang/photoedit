const upload = document.getElementById('upload');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const brightness = document.getElementById('brightness');
const contrast = document.getElementById('contrast');
const red = document.getElementById('red');
const green = document.getElementById('green');
const blue = document.getElementById('blue');
const hue = document.getElementById('hue');

let img = new Image();
let imgSrc = '';
let originalImage = null;

upload.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        img.onload = function() {
            imgSrc = img.src;
            [brightness, contrast, red, green, blue].forEach(slider => {
                slider.value = 100;
                slider.dispatchEvent(new Event('input'));
            });
            hue.value = 0;
            hue.dispatchEvent(new Event('input'));
            drawToCanvas();
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
});

[brightness, contrast, red, green, blue, hue].forEach(input => {
    input.addEventListener('input', applyFilters);
});

function resetSlider(id) {
    document.getElementById(id).value = (id === 'hue') ? 0 : 100;
    applyFilters();
    document.getElementById(id).dispatchEvent(new Event('input'));
}

function drawToCanvas() {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    tempCtx.drawImage(img, 0, 0);

    const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);

    originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function applyFilters() {
    if (!originalImage) return;

    const brightVal = brightness.value / 100;
    const contrastVal = contrast.value / 100;
    const redVal = red.value / 100;
    const greenVal = green.value / 100;
    const blueVal = blue.value / 100;
    const hueVal = parseInt(hue.value);

    const imageData = new ImageData(new Uint8ClampedArray(originalImage.data), originalImage.width, originalImage.height);

    for (let i = 0; i < imageData.data.length; i += 4) {
        let r = imageData.data[i];
        let g = imageData.data[i + 1];
        let b = imageData.data[i + 2];
        
        r = ((r - 128) * contrastVal + 128) * brightVal * redVal;
        g = ((g - 128) * contrastVal + 128) * brightVal * greenVal;
        b = ((b - 128) * contrastVal + 128) * brightVal * blueVal;

        let [h, s, l] = rgbToHsl(r, g, b);
        if (!isNaN(h)) {
            h = (h + hueVal) % 360;
            if (h < 0) h += 360;
        }
        [r, g, b] = hslToRgb(h, s, l);

        imageData.data[i] = truncate(r);
        imageData.data[i + 1] = truncate(g);
        imageData.data[i + 2] = truncate(b);
    }

    ctx.putImageData(imageData, 0, 0);
}

function truncate(val) {
    return Math.max(0, Math.min(255, val));
}

function reset() {
    if (!imgSrc) return;
    [brightness, contrast, red, green, blue].forEach(slider => {
        slider.value = 100;
        slider.dispatchEvent(new Event('input'));
    });
    hue.value = 0;
    hue.dispatchEvent(new Event('input'));
    img.src = imgSrc;
    img.onload = () => drawToCanvas();
}

function download() {
    if (!img) return;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    tempCtx.drawImage(img, 0, 0);

    let imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    const brightnessVal = brightness.value / 100;
    const contrastVal = contrast.value / 100;
    const redVal = red.value / 100;
    const greenVal = green.value / 100;
    const blueVal = blue.value / 100;
    const hueVal = parseInt(hue.value);

    for (let i = 0; i < imageData.data.length; i += 4) {
        let r = imageData.data[i];
        let g = imageData.data[i + 1];
        let b = imageData.data[i + 2];

        r = ((r - 128) * contrastVal + 128) * brightnessVal * redVal;
        g = ((g - 128) * contrastVal + 128) * brightnessVal * greenVal;
        b = ((b - 128) * contrastVal + 128) * brightnessVal * blueVal;

        let [h, s, l] = rgbToHsl(r, g, b);
        if (!isNaN(h)) {
            h = (h + hueVal) % 360;
            if (h < 0) h += 360;
        }
        [r, g, b] = hslToRgb(h, s, l);

        imageData.data[i] = truncate(r);
        imageData.data[i + 1] = truncate(g);
        imageData.data[i + 2] = truncate(b);
    }

    tempCtx.putImageData(imageData, 0, 0);

    const link = document.createElement('a');
    link.download = 'edited_image.jpg';
    link.href = tempCanvas.toDataURL('image/jpeg', 0.9);
    link.click();
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
            case g: h = ((b - r) / d + 2); break;
            case b: h = ((r - g) / d + 4); break;
        }
        h *= 60;
    }
    return [h, s, l];
}

function hslToRgb(h, s, l) {
    h /= 360;
    let r, g, b;

    if (s === 0 || isNaN(h)) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r * 255, g * 255, b * 255];
}

const rangeInputs = document.querySelectorAll('input[type="range"]');
rangeInputs.forEach(input => {
    input.addEventListener('input', function () {
        let value;
        if (this.id === 'hue') {
            value = (parseInt(this.value) + 180) / 360;
        } else {
            value = (this.value - this.min) / (this.max - this.min);
        }
        this.style.background = `linear-gradient(to right, #6b8e23 ${value * 100}%, #ffffff ${value * 100}%)`;
    });
    input.dispatchEvent(new Event('input'));
});