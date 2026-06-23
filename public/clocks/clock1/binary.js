(function () {
  const state = {
    chars: null,
    minuteKey: "",
    rotations: [0, 0, 0, 0],
    anims: [null, null, null, null],
  };

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 4);
  }

  function randomRotations() {
    return Array.from(
      { length: 4 },
      () => (Math.random() * 10 - 5) * Math.PI / 180
    );
  }


  function parseColor(color) {
    if (typeof color !== "string") {
      return {r:105,g:247,b:255};
    }

    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());

    if(hex){
      let raw = hex[1];

      if(raw.length===3){
        raw = raw.split("").map(x=>x+x).join("");
      }

      return {
        r:parseInt(raw.slice(0,2),16),
        g:parseInt(raw.slice(2,4),16),
        b:parseInt(raw.slice(4,6),16)
      };
    }

    return {r:105,g:247,b:255};
  }


  function lighten(hex, amount){

    const c=parseColor(hex);

    return `rgb(
      ${Math.round(c.r+(255-c.r)*amount)},
      ${Math.round(c.g+(255-c.g)*amount)},
      ${Math.round(c.b+(255-c.b)*amount)}
    )`;
  }



  function drawDigit(
    ctx,
    x,
    y,
    value,
    rotation,
    color,
    font,
    alpha=1
  ){

    ctx.save();

    ctx.translate(x,y);
    ctx.rotate(rotation);

    ctx.globalAlpha=alpha;

    ctx.font=font;
    ctx.fillStyle=color;

    ctx.textAlign="center";
    ctx.textBaseline="middle";

    ctx.fillText(value,0,0);

    ctx.restore();
  }



  function drawAnimatedDigit(
    ctx,
    index,
    x,
    y,
    anim,
    color,
    font,
    height,
    now
  ){

    const progress=Math.min(
      1,
      (now-anim.startedAt)/650
    );


    const t=easeOutQuart(progress);


    const distance=height*0.75;


    // old
    drawDigit(
      ctx,
      x,
      y+t*distance,
      anim.from,
      state.rotations[index],
      color,
      font,
      1-t
    );


    // new
    drawDigit(
      ctx,
      x,
      y-distance+t*distance,
      anim.to,
      state.rotations[index],
      color,
      font,
      t
    );


    if(progress>=1){
      state.chars[index]=anim.to;
      state.anims[index]=null;
    }

  }




window.renderClock5=function(
  ctx,
  w,
  h,
  paint,
  size,
  now,
  opts
){

  now=now||new Date();
  opts=opts||{};


  ctx.clearRect(0,0,w,h);



  const hh=String(now.getHours()).padStart(2,"0");
  const mm=String(now.getMinutes()).padStart(2,"0");

  const chars=[
    hh[0],
    hh[1],
    mm[0],
    mm[1]
  ];


  const minuteKey=`${hh}:${mm}`;

  const nowMs=now.getTime();



  if(!state.chars){

    state.chars=chars.slice();
    state.minuteKey=minuteKey;
    state.rotations=randomRotations();

  }



  if(state.minuteKey!==minuteKey){

    state.minuteKey=minuteKey;
    state.rotations=randomRotations();

  }



  chars.forEach((c,i)=>{

    if(
      state.chars[i]!==c &&
      !state.anims[i]
    ){

      state.anims[i]={
        from:state.chars[i],
        to:c,
        startedAt:nowMs
      };

    }

  });



  const family =
    opts.fontFamily ||
    '"Arial Rounded MT Bold","Nunito","Segoe UI Rounded",sans-serif';


  const weight=850;


  const primary =
    typeof paint==="string"
    ? paint
    : "#69f7ff";


  const secondary =
    lighten(primary,0.55);



  let fontSize =
    Math.min(
      h*0.75,
      w*0.22,
      size*1.35
    );


  fontSize=Math.floor(fontSize);



  const font =
    `${weight} ${fontSize}px ${family}`;



  ctx.font=font;


  const widths=chars.map(
    c=>ctx.measureText(c).width
  );


  const gap=fontSize*0.18;

  const overlap=fontSize*0.12;


  const total =
    widths[0]+widths[1]+
    widths[2]+widths[3]
    - overlap*3
    + gap;



  let x=(w-total)/2;


  const y=h/2;



  const positions=[];


  for(let i=0;i<4;i++){

    positions[i]=
      x+widths[i]/2;

    x+=
      widths[i]
      -overlap;

    if(i===1)
      x+=gap;

  }



  const colors=[
    primary,
    secondary,
    primary,
    secondary
  ];



  for(let i=0;i<4;i++){

    if(state.anims[i]){

      drawAnimatedDigit(
        ctx,
        i,
        positions[i],
        y,
        state.anims[i],
        colors[i],
        font,
        h,
        nowMs
      );

    }
    else{

      drawDigit(
        ctx,
        positions[i],
        y,
        state.chars[i],
        state.rotations[i],
        colors[i],
        font
      );

    }

  }



  // colon

  const cx=
    (positions[1]+positions[2])/2;


  ctx.save();

  ctx.fillStyle=
    opts.colonColor ||
    "white";

  ctx.globalAlpha = 0.85;


  ctx.beginPath();

  const r=
    Math.max(
      5,
      fontSize*0.06
    );


  ctx.arc(
    cx,
    y-fontSize*0.18,
    r,
    0,
    Math.PI*2
  );

  ctx.arc(
    cx,
    y+fontSize*0.18,
    r,
    0,
    Math.PI*2
  );


  ctx.fill();

  ctx.restore();


};


})();