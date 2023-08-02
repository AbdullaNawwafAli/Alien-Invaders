import { interval, fromEvent,merge } from 'rxjs'
import { map, filter, takeUntil,mergeMap,scan,switchMap } from 'rxjs/operators'
function spaceinvaders() {

    // Inside this function you will use the classes and functions 
    // from rx.js
    // to add visuals to the svg element in pong.html, animate them, and make them interactive.
    // Study and complete the tasks in observable exampels first to get ideas.
    // Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/ 
    // You will be marked on your functional programming style
    // as well as the functionality that you implement.
    // Document your code!  

    //most code is derived from https://stackblitz.com/edit/asteroids05-rtak5w?file=index.ts


    //Immutable Vector Class
    class Vec {
      constructor(public readonly x: number = 0, public readonly y: number = 0) {}
      add = (b:Vec) => new Vec(this.x + b.x, this.y + b.y)
      sub = (b:Vec) => this.add(b.scale(-1))
      len = ()=> Math.sqrt(this.x*this.x + this.y*this.y)
      scale = (s:number) => new Vec(this.x*s,this.y*s)
      ortho = ()=> new Vec(this.y,-this.x)
      rotate = (deg:number) =>
                (rad =>(
                    (cos,sin,{x,y})=>new Vec(x*cos - y*sin, x*sin + y*cos)
                  )(Math.cos(rad), Math.sin(rad), this)
                )(Math.PI * deg / 180)
    
      static unitVecInDirection = (deg: number) => new Vec(0,-1)
      static unitMoveLeftDirection = (deg: number) => new Vec(-1,0).rotate(deg)
      static unitMoveRightDirection = (deg: number) => new Vec(1,0).rotate(deg)
      static Zero = new Vec();
    }

    //Derived from https://www.youtube.com/watch?v=RD9v9XHA4x4
    class RNG{
      readonly m = 0x80000000
      readonly a =1103515245
      readonly c = 12345

      constructor(readonly state :number){}

      int(){
        return((this.a * this.state) + this.c) % this.m;
      }
      float(){
        return this.int() / (this.m - 1)
      }
      next(){
        return new RNG(this.int())
      }

    }

    const 
    Constants = {
      CanvasSize: 600,
      BulletExpirationTime: 1000,
      BulletRadius: 3,
      BulletVelocity: 2,
      StartAliensRadius: 15,
      StartAliensCount: 55,
      AlienX:[50,100,150,200,250,300,350,400,450,500,550,50,100,150,200,250,300,350,400,450,500,550,50,100,150,200,250,300,350,400,450,500,550,50,100,150,200,250,300,350,400,450,500,550,50,100,150,200,250,300,350,400,450,500,550],
      AlienY: [40,40,40,40,40,40,40,40,40,40,40,80,80,80,80,80,80,80,80,80,80,80,120,120,120,120,120,120,120,120,120,120,120,160,160,160,160,160,160,160,160,160,160,160,200,200,200,200,200,200,200,200,200,200,200],
      RotationAcc: 0.1,
      ThrustAcc: 0.05,
      StartTime: 0
    } as const

    //There are 5 types of game state transitions
    class Tick { constructor(public readonly elapsed:number) {} }
    class AlienShooterTimer { constructor(public readonly elapsed:number) {} }
    class Left { constructor(public readonly on:boolean) {} }
    class Right { constructor(public readonly on:boolean) {} }
    class Shoot { constructor() {} }

    type Event = 'keydown' | 'keyup'
    type Key = 'ArrowLeft' | 'ArrowRight' | 'Space'

    //These are the ViewTypes on my game
    type ViewType = 'ship' | 'alien' | 'bullet' |'alienbullet'

    //Simple timer to automate when aliens will shoot in intervals
    const alienShootTimer = interval(1000).pipe(map(timer => new AlienShooterTimer(timer)))

    const 
    gameClock = interval(10)
      .pipe(map(elapsed=>new Tick(elapsed))),
    observeKey = <T>(eventName:string, k:Key, result:()=>T)=>fromEvent<KeyboardEvent>(document,eventName)
      .pipe(
        filter(({code})=>code === k),
        filter(({repeat})=>!repeat),
        map(result)),
        startLeft = observeKey('keydown','ArrowLeft', ()=>new Left(true)),
        stopLeft = observeKey('keyup','ArrowLeft', ()=>new Left(false)),
        startRight = observeKey('keydown','ArrowRight', ()=>new Right(true)),
        stopRight = observeKey('keyup','ArrowRight', ()=>new Right(false)),
        shoot = observeKey('keydown','Space', ()=>new Shoot())

  
  type Circle = Readonly<{pos:Vec, radius:number}>
  type ObjectId = Readonly<{id:string,createTime:number}>
  type Body = Readonly<IBody>

  interface IBody extends Circle, ObjectId {
    viewType: ViewType,
    vel:Vec,
    acc:Vec,
    right: boolean,
    left: boolean,
    angle:number,
    rotation:number,
    torque:number
  }

  //This is the game state
  type State = Readonly<{
    time:number,
    ship:Body,
    bullets:ReadonlyArray<Body>,
    aliens:ReadonlyArray<Body>,
    alienbullets:ReadonlyArray<Body>,
    exit:ReadonlyArray<Body>,
    objCount:number,
    gameOver:boolean,
    score: number
    rando: number,
  }>

  //All bullets(meaning as well as Aliens bullets) and the aliens are all Circles
  const createCircle = (viewType: ViewType)=> (oid:ObjectId)=> (circ:Circle)=> (vel:Vec)=>
    <Body>{
      ...oid,
      ...circ,
      vel:vel,
      acc:Vec.Zero,
      angle:0, rotation:0, torque:0,
      id: viewType+oid.id,
      viewType: viewType
    },
    createAlien = createCircle('alien'),
    createBullet = createCircle('bullet'),
    createAlienBullet = createCircle('alienbullet')

    function createShip():Body {
      return {
        id: 'ship',
        viewType: 'ship',
        pos: new Vec(Constants.CanvasSize/2,550),
        vel: Vec.Zero,
        acc: Vec.Zero,
        left: false,
        right: false,
        angle:0,
        rotation:0,
        torque:0,
        radius:20,
        createTime:0
      }
    }

    //We are using this to give each alien a starting velocity going right
    const 
    initialAliensDirections = [...Array(Constants.StartAliensCount)]
      .map(()=>new Vec(1,0.04)),

    
    //Creating the the array of aliens
    startAliens = [...Array(Constants.StartAliensCount)]
      .map((_,i)=>createAlien({id:String(i),createTime:Constants.StartTime})
                            ({pos:new Vec(Constants.AlienX[i],Constants.AlienY[i]),radius:Constants.StartAliensRadius})
                            (initialAliensDirections[i])),
    
                            
    //Initial Game state
    initialState:State = {
      time:0,
      ship: createShip(),
      bullets: [],
      aliens: startAliens,
      alienbullets: [],
      exit: [],
      objCount: Constants.StartAliensCount,
      gameOver: false,
      score: 0,
      rando: new RNG(55).float()
    },

    //Four Seperate Movement functions for bullets(moveBody),alienbullets(moveAlienBullet),ship(moveShip) and Aliens(moveAlien)
    moveBody = (o:Body) => <Body>{
      ...o,
      rotation: o.rotation + o.torque,
      angle:o.angle+o.rotation,
      pos:o.pos.add(o.vel),
      vel:o.vel.add(o.acc)
    },

    moveAlienBullet = (o:Body) => <Body>{
      ...o,
      rotation: o.rotation + o.torque,
      angle:o.angle+o.rotation,
      pos:o.pos.sub(o.vel),
      vel:o.vel.sub(o.acc)
    },
    
    moveShip = (o:Body) => <Body>{
      ...o,
      rotation: o.rotation + o.torque,
      angle:o.angle+o.rotation,
      //it is edited like this so there is no velocity, it will just towards the direction indicated with no velocity
      //also so that the ship does not leave the bounds of the canvas
      pos: o.pos.add(o.acc).x  < 600 && o.pos.add(o.acc).x > 5 ? o.pos.add(o.acc): o.pos,
      vel: Vec.Zero
    },

    moveAlien = (o:Body) => <Body>{
      ...o,
      rotation: o.rotation + o.torque,
      angle:o.angle+o.rotation,
      pos:o.pos.add(o.vel),
      //changes the directions of the aliens as well as make sure they do not go out of the canvas
      vel : o.pos.add(o.vel).x > 600 ? new Vec(-1,0.04) : o.pos.add(o.vel).x < 5 ?  new Vec(1,0.04) : o.vel
      
    },

    //Checking State for collisions as well as whether the game is over(all alien dead)
    //bullets will destroy an alien and increment the score by 10 for each alien killed by a bullet
    //game is over if aliens hit the player(ship),if player is hit by an alien bullet and if all aliens die.
    handleCollisionsAndGameOver = (s:State) => {
      const
        bodiesCollided = ([a,b]:[Body,Body]) => a.pos.sub(b.pos).len() < a.radius + b.radius,
        shipCollided = s.aliens.filter(r=>bodiesCollided([s.ship,r])).length > 0 || s.alienbullets.filter(r=>bodiesCollided([s.ship,r])).length > 0 || s.score  == 550, 
        allBulletsAndRocks = flatMap(s.bullets, b=> s.aliens.map<[Body,Body]>(r=>([b,r]))),
        collidedBulletsAndRocks = allBulletsAndRocks.filter(bodiesCollided),
        collidedBullets = collidedBulletsAndRocks.map(([bullet,_])=>bullet),
        collidedRocks = collidedBulletsAndRocks.map(([_,alien])=>alien),


                      cut = except((a:Body)=>(b:Body)=>a.id === b.id)
      
     
                      return <State>{
                        ...s,
                        bullets: cut(s.bullets)(collidedBullets),
                        aliens: cut(s.aliens)(collidedRocks),
                        exit: s.exit.concat(collidedBullets,collidedRocks),
                        objCount: s.objCount ,
                        gameOver: shipCollided,
                        //incrementing the score by 10
                        score : s.score + (collidedBullets.length*10)
                      }
                    },

    //this is tick which will make the objects move and will also remove any expired bullets
    tick = (s:State,elapsed:number) => {
      const 
        expired = (b:Body)=>(elapsed - b.createTime) > Constants.BulletExpirationTime,
        //to remove player bullets
        expiredBullets:Body[] = s.bullets.filter(expired),
        activeBullets = s.bullets.filter(not(expired)),
        //to remove alien bullets
        expiredAlienBullets:Body[] = s.alienbullets.filter(expired),
        activeAlienBullets = s.alienbullets.filter(not(expired))
      return handleCollisionsAndGameOver({...s, 
        ship:moveShip(s.ship), 
        bullets:activeBullets.map(moveBody), 
        alienbullets:activeAlienBullets.map(moveAlienBullet),
        aliens: s.aliens.map(moveAlien),
        exit:expiredBullets.concat(expiredAlienBullets),
        time:elapsed,
        //Creating a new random float number according to the elapsed time and setting it to random
        //this is that the same alien doesn't always shoot as the rando value will be used in the aliens shooting calculation
        rando: new RNG(elapsed).float(),
      })
    },

    //State Reduction
    reduceState = (s:State, e:Left|Right|Tick|Shoot|AlienShooterTimer)=>
    //to Make the Ship move Right when the right arrow keydown is pressed.
    e instanceof Right
        ? {
            ...s,
            ship: {
              ...s.ship,
              acc: e.on
                ? Vec.unitMoveRightDirection(s.ship.angle).scale(
                    2
                  )
                : Vec.Zero
            }}:
    //to make the ship move left then the left arrow keydown is pressed.
    e instanceof Left
        ? {
            ...s,
            ship: {
              ...s.ship,
              acc: e.on
                ? Vec.unitMoveLeftDirection(s.ship.angle).scale(
                    2
                  )
                : Vec.Zero
            }}:
    //to make the ship shoot when the spacebar keydown is pressed.
    e instanceof Shoot ? {...s,
        bullets: s.bullets.concat([
              ((unitVec:Vec)=>
                createBullet({id:String(s.objCount),createTime:s.time})
                  ({radius:Constants.BulletRadius,pos:s.ship.pos.add(unitVec.scale(s.ship.radius))})
                  (s.ship.vel.add(unitVec.scale(Constants.BulletVelocity)))
               )(Vec.unitVecInDirection(s.ship.angle))]),
        objCount: s.objCount + 1
      } :
      //to make the aliens shoot at regular intervals based on the rando number in the gamestate
      //makes sure that the same alien does not always shoot and adds chances for other aliens to shoot according to their position the aliens array
      e instanceof AlienShooterTimer ? {...s,
        alienbullets: s.aliens.length > 0 ? s.alienbullets.concat([
          ((unitVec:Vec)=>
            createAlienBullet({id:String(s.objCount),createTime:s.time})
              ({radius:Constants.BulletRadius,pos:s.aliens[(Math.round(s.rando)*10) < s.aliens.length ? Math.round(s.rando)*10 : 0].pos.add(unitVec.scale(s.ship.radius))})
              (new Vec(0,-1.5))
           )(Vec.unitVecInDirection(s.aliens[0].angle))]) : s.alienbullets,
           objCount: s.objCount + 1
      } :
      tick(s,e.elapsed)

      
    //updating the SVG scene and is the only impure function in the code
    function updateView(s: State) { 
         const
            svg = document.getElementById("svgCanvas")!,
            ship = document.getElementById("ship")!,
            show = (id:string,condition:boolean)=>((e:HTMLElement) => 
              condition ? e.classList.remove('hidden')
                        : e.classList.add('hidden'))(document.getElementById(id)!);
            //This function appends the various SVG element to the canvas
            const updateBodyView = (b:Body) => {
              function createBodyView() {
                const v = document.createElementNS(svg.namespaceURI, "ellipse")!;
                attr(v,{id:b.id,rx:b.radius,ry:b.radius});
                v.classList.add(b.viewType)
                svg.appendChild(v)
                return v;
              }
              
              const v = document.getElementById(b.id) || createBodyView();
              attr(v,{cx:b.pos.x,cy:b.pos.y});

            };
          //updating the text for the Score as indicated by the id of the SVG element
          const scorething = document.getElementById("Score")!.textContent = String(s.score);

          //Changing the ships Attributes as its attributes arent as easily updateable as the rest of the svg elements
          attr(ship,{transform:`translate(${s.ship.pos.x},${s.ship.pos.y}) rotate(${s.ship.angle})`});

          //adding aliens bullets when called for
          s.alienbullets.forEach(updateBodyView);
          //adding bullets when called for
          s.bullets.forEach(updateBodyView);
          //adding the aliens to the game
          s.aliens.forEach(updateBodyView);

          //to remove svg elements that leave the canvas
          s.exit.map(o=>document.getElementById(o.id))
                .filter(isNotNullOrUndefined)
                .forEach(v=>{
                  try {
                    svg.removeChild(v)
                  } catch(e) {
                    console.log("Already removed: "+v.id)
                  }
                })
          //used when the game is over to to display that the game is over
          //also will display the players score
          if(s.gameOver) {
            subscription.unsubscribe();
            const v = document.createElementNS(svg.namespaceURI, "text")!;
            const d = document.createElementNS(svg.namespaceURI, "text")!;
            attr(v,{x:Constants.CanvasSize/6,y:Constants.CanvasSize/2,class:"gameover"});
            attr(d,{x:Constants.CanvasSize/6,y:400,class:"gameover"});
            v.textContent = "Game Over";
            d.textContent = "Score: " + s.score;
            svg.appendChild(v);
            svg.appendChild(d);
          }
    }

    //this is the main game stream
    const subscription =
    merge(gameClock,
      startRight,
      startLeft,stopRight,stopLeft,
      shoot,alienShootTimer)
    .pipe(
      scan(reduceState, initialState))
    .subscribe(updateView)
  
  

  //Utiity Functions are beyond this point and are all(small explanations as well) derived from https://stackblitz.com/edit/asteroids05-rtak5w?file=index.ts

    // Type guard to use in filters
    function isNotNullOrUndefined<T extends Object>(input: null | undefined | T): input is T {
      return input != null;
    }

    //apply f to every element of a and return the result in a flat array 
    function flatMap<T,U>(
      a:ReadonlyArray<T>,
      f:(a:T)=>ReadonlyArray<U>
    ): ReadonlyArray<U> {
      return Array.prototype.concat(...a.map(f));
    }

    
const
  //composable not to invert boolean result of given function
  not = <T>(f:(x:T)=>boolean)=> (x:T)=> !f(x),

  //to check if e is an element of a
  elem = 
    <T>(eq: (_:T)=>(_:T)=>boolean)=> (a:ReadonlyArray<T>)=> (e:T)=> a.findIndex(eq(e)) >= 0,

  //array a except anything in array b
  except = 
    <T>(eq: (_:T)=>(_:T)=>boolean)=>(a:ReadonlyArray<T>)=> (b:ReadonlyArray<T>)=> a.filter(not(elem(eq)(b))),

  //set a multiples attributes of an element at once
  attr = (e:Element, o:Object) =>{ for(const k in o) e.setAttribute(k,String(o[k])) }


  
}


  
  // the following simply runs your pong function on window load.  Make sure to leave it in place.
  if (typeof window != 'undefined')
    window.onload = ()=>{
      spaceinvaders();
    }
  

