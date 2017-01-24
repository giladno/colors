// http://konvajs.github.io/docs/sandbox/Wheel_of_Fortune.html
let width = window.innerWidth, height = window.innerHeight;
let fps = 5;
let duration = 2000;
let size = 320;
let cache = {};

window.location.search.match(/^\??(.*)/)[1].split('&').map(pair=>pair.split('=')).forEach(pair=>{
    switch(pair[0])
    {
    case 'size':
        size = (+pair[1])||320;
        break;
    case 'fps':
        fps = (+pair[1])||5;
        break;
    case 'duration':
        duration = (+pair[1])||2000;
        break;
    }
});

const rect = colors=>new Promise((resolve, reject)=>{
    let id = 'r_'+colors.join('|');
    let image = cache[id];
    if (image)
        return resolve(image);
    let layer = new Konva.Layer();
    let rect = new Konva.Rect({
        x: 0,
        y: 0,
        width: size,
        height: size,
        fill: colors[0],
    });
    layer.add(rect);
    [1, 2, 2, 2, 2, 1].reduce((x, lines, i)=>{
        let stripe = new Konva.Rect({
            x: x,
            y: 0,
            width: size/10*lines,
            height: size,
            fill: colors[i%colors.length],
        });
        layer.add(stripe);
        return x+stripe.getWidth();
    }, 0);
    layer.toImage({
        width: size,
        height: size,
        callback: img=>resolve(cache[id] = new Konva.Image({
            image: img,
            listening: false,
            x: (width-size)/2,
            y: (height-size)/2,
        })),
    });
});

const grid = colors=>new Promise((resolve, reject)=>{
    let id = 'g_'+colors.join('|');
    let image = cache[id];
    if (image)
        return resolve(image);
    let layer = new Konva.Layer();
    for (let y=0; y<size; y++)
    {
        if (y&1)
        {
            layer.add(new Konva.Line({
                points: [0, y, size, y],
                stroke: colors[1],
                strokeWidth: 1,
                dash: [size/5, size/5, size/5, size/5, size/5],
            }));
            layer.add(new Konva.Line({
                points: [size/5, y, size/5*4, y],
                stroke: colors[3],
                strokeWidth: 1,
                dash: [size/5, size/5, size/5],
            }));
            continue;
        }
        layer.add(new Konva.Line({
            points: [0, y, size, y],
            stroke: colors[0],
            strokeWidth: 1,
            dash: [size/5, size/5, size/5, size/5, size/5],
        }));
        layer.add(new Konva.Line({
            points: [size/5, y, size/5*4, y],
            stroke: colors[2],
            strokeWidth: 1,
            dash: [size/5, size/5, size/5],
        }));
    }
    layer.toImage({
        width: size,
        height: size,
        callback: img=>resolve(cache[id] = new Konva.Image({
            image: img,
            listening: false,
            x: (width-size)/2,
            y: (height-size)/2,
        })),
    });
});

let stage = new Konva.Stage({
    container: 'container',
    width: width,
    height: height
});
let layer = new Konva.Layer();
let green = 240;
let rects = [], i = 0;

let progress = {
    bar: new Konva.Rect({
        x: (width-256)/2,
        y: (height-size)/2+size+20,
        width: 256,
        height: 10,
        fill: 'green',
        stroke: 'black',
        strokeWidth: 4,
    }),
    thumb: new Konva.Circle({
        x: (width-256)/2+green,
        y: (height-size)/2+size+25,
        radius: 10,
        fill: 'blue',
        stroke: 'black',
        strokeWidth: 2,
        draggable: true,
        dragBoundFunc: function(pos){
            return {
                x: Math.min(Math.max(pos.x, progress.bar.x()), progress.bar.x()+255),
                y: this.getAbsolutePosition().y,
            };
        },
    }),
};

progress.thumb.on('dragmove', e=>{
    let g = (e.target.getAbsolutePosition().x-progress.bar.x());
    if (g==green)
        return;
    green = g;
    update();
});

layer.add(progress.bar);
layer.add(progress.thumb);

const update = ()=>Promise.all([
    rect([`rgb(0,${green},0)`, 'rgb(240,0,0)']),
    grid(['rgb(255,0,0)', `rgb(0,${Math.round(green*17/16)},0)`,
        'rgb(225,0,0)', `rgb(0,${Math.round(green*15/16)},0)`]),
    rect(['rgb(240,0,0)', `rgb(0,${green},0)`]),
    grid([`rgb(0,${Math.round(green*17/16)},0)`, 'rgb(255,0,0)',
        `rgb(0,${Math.round(green*15/16)},0)`, 'rgb(225,0,0)']),
]).then(res=>{
    res = res.filter(i=>i);
    rects.forEach(r=>r.destroy());
    (rects = res).forEach((r, index)=>{
        layer.add(r);
        if (i!=index)
            r.hide();
    });
});



let tasks = [];
for (let g=0; g<256; g++)
{
    tasks.push(rect([`rgb(0,${green},0)`, 'rgb(240,0,0)']));
    tasks.push(rect(['rgb(240,0,0)', `rgb(0,${green},0)`]));
}

Promise.all(tasks).then(()=>update()).then(()=>{
    stage.add(layer);
    let time = 0, frame_delay = 1000/fps;
    let anim = new Konva.Animation(function(frame){
        time += frame.timeDiff;
        i = (i+Math.floor(time/frame_delay))%rects.length;
        time = time%frame_delay;
        rects.forEach((r, index)=>i==index ? r.show() : r.hide());
    }, layer);
    anim.start();
    if (duration)
        setTimeout(()=>anim.stop(), duration);
    window.onload = function(){
        document.addEventListener('keydown', function(e){
            if (e.keyCode==37) // left
                green = Math.max(green-1, 0);
            else if (e.keyCode==39) // right
                green = Math.min(green+1, 255);
            else
                return;
            progress.thumb.x((width-256)/2+green);
            update();
        }, false);
    };
});
