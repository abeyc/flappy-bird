// uses www.phaser.io

// Global variables, i.e., global to everything
var DEBUG = false;
var SPEED = 200;
var GRAVITY = 20;
var FLAP = 700;
var SPAWN_RATE = 1 / 1.2;
var OPENING = 150;

WebFontConfig = {
    google: { families: [ 'Press+Start+2P::latin' ] },
    active: main
};

(function() {
    var wf = document.createElement('script');
    wf.src = ('https:' == document.location.protocol ? 'https' : 'http') +
      '://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
    wf.type = 'text/javascript';
    wf.async = 'true';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(wf, s);
})();

function main() {

    // “parent” and “game” and “state” are semi-global”, i.e., global to everything between the two red lines

    var state = {
        preload: preload,
        create: create,
        update: update,
        render: render
    };

    var parent = document.querySelector('#screen');

    var game = new Phaser.Game(
        0,
        0,
        Phaser.CANVAS,
        parent,
        state,
        false,
        false
    );

    function preload() {    // assign YOUR GAME specific assets - images and sounds
        var assets = {
            spritesheet: {
                birdie: ['assets/birdie.png', 35, 35],
                clouds: ['assets/clouds.png', 128, 64]
            },
            image: {
                finger: ['assets/finger.png', 90, 323],
                fence: ['assets/fence.png', 189, 60]
            },
            audio: {
                flap: ['assets/flap.wav'],
/*                score: ['assets/score.wav'],*/
                hurt: ['assets/hurt.wav']
            }
        };
        Object.keys(assets).forEach(function(type) {
            Object.keys(assets[type]).forEach(function(id) {
                game.load[type].apply(game.load, [id].concat(assets[type][id]));
            });
        });
    }

// “gameStarted”, “gameOver”, “score”, “bg”, etc. are semi-global”, i.e., global to everything between the two red lines
// The type of each of these variables will be determined at first use.

    var gameStarted,
        gameOver,
        score,
        bg,
        credits,
        clouds,
        fingers,
        invs,
        birdie,
        fence,
        scoreText,
        instText,
        gameOverText,
        flapSnd,
        scoreSnd,
        hurtSnd,
        fingersTimer,
        cloudsTimer;

    function create() {                // provide YOUR GAME-specific attributes for use with Phaser

        // Set world dimensions
        var screenWidth = parent.clientWidth > window.innerWidth ? window.innerWidth : parent.clientWidth;
        var screenHeight = parent.clientHeight > window.innerHeight ? window.innerHeight : parent.clientHeight;
        game.world.width = screenWidth;
        game.world.height = screenHeight;

        // Draw bg (background)
        bg = game.add.graphics(0, 0);
        bg.beginFill(0xff0000, 1);
        bg.drawRect(0, 0, game.world.width, game.world.height);
        bg.endFill();

        // Credits - size, shape, and color of credits “box”, font spec
        credits = game.add.text(
            game.world.width / 2,
            10,
            '',
            {
                font: '8px "Press Start 2P"',
                fill: '#fff',
                align: 'center'
            }
        );
        credits.anchor.x = 0.5;

        // Add clouds group
        clouds = game.add.group();

        // Add fingers
        fingers = game.add.group();

        // Add invisible thingies
        invs = game.add.group();

        // Add birdie
        birdie = game.add.sprite(0, 0, 'birdie');
        birdie.anchor.setTo(0.5, 0.5);
        birdie.animations.add('fly', [0, 1, 2, 3], 10, true);
        birdie.inputEnabled = true;
        birdie.body.collideWorldBounds = true;
        birdie.body.gravity.y = GRAVITY;

        // Add fence
        fence = game.add.tileSprite(0, game.world.height - 120, game.world.width, 120, 'fence');
        fence.tileScale.setTo(2, 2);

        // Score - size, shape, and color of score “box”, font spec
        scoreText = game.add.text(
            game.world.width / 2,
            game.world.height / 4,
            "",
            {
                font: '16px "Press Start 2P"',
                fill: '#fff',
                stroke: '#430',
                strokeThickness: 4,
                align: 'center'
            }
        );
        scoreText.anchor.setTo(0.5, 0.5);

        // Instructions - size, shape, and color of instructions “box”, font spec
        instText = game.add.text(
            game.world.width / 2,
            game.world.height - game.world.height / 4,
            "",
            {
                font: '8px "Press Start 2P"',
                fill: '#fff',
                stroke: '#430',
                strokeThickness: 4,
                align: 'center'
            }
        );
        instText.anchor.setTo(0.5, 0.5);

        // Game over - size, shape, and color of game over “box”, font spec
        gameOverText = game.add.text(
            game.world.width / 2,
            game.world.height / 2,
            "",
            {
                font: '16px "Press Start 2P"',
                fill: '#fff',
                stroke: '#430',
                strokeThickness: 4,
                align: 'center'
            }
        );
        gameOverText.anchor.setTo(0.5, 0.5);
        gameOverText.scale.setTo(2, 2);

        // Add sounds
        flapSnd = game.add.audio('flap');
        scoreSnd = game.add.audio('score');
        hurtSnd = game.add.audio('hurt');

        // Add controls
        game.input.onDown.add(flap);

        // add keyboard controls
        flapKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
        flapKey.onDown.add(flap);

        // keep the spacebar from propagating up to the browser
        game.input.keyboard.addKeyCapture([Phaser.Keyboard.SPACEBAR]);

        // Start clouds timer
        cloudsTimer = new Phaser.Timer(game);
        cloudsTimer.onEvent.add(spawnCloud);
        cloudsTimer.start();
        cloudsTimer.add(Math.random());

        // RESET!
        reset();
    }

    function reset() {      // set up for a new game
        gameStarted = false;       //  old game has ended
        gameOver = false;           //  reset for new game
        score = 0;                        //  reset for new game
        credits.renderable = true;
        scoreText.setText("DON'T\nTOUCH\nMY\nBIRDIE");
        instText.setText("TOUCH TO FLAP\nBIRDIE WINGS");
        gameOverText.renderable = false;
        birdie.body.allowGravity = false;     // set birdie to hovering
        birdie.angle = 0;                             // birdie has no pitch
        birdie.reset(game.world.width / 4, game.world.height / 2);
        birdie.scale.setTo(2, 2);
        birdie.animations.play('fly');
        fingers.removeAll();            // remove all the barriers
        invs.removeAll();
    }

    function start() {        //  start a new game
        credits.renderable = false;
        birdie.body.allowGravity = true;

        // start drawing the fingers
        fingersTimer = new Phaser.Timer(game);
        fingersTimer.onEvent.add(spawnFingers);
        fingersTimer.start();
        fingersTimer.add(2);

        // Show score
        scoreText.setText(score);
        instText.renderable = false;

        // START!
        gameStarted = true;
    }

    function flap() {      // runs upon mouse click(and spacebar prep)
        if (!gameStarted) {    // if game has not already started, start it
            start();
        }
        if (!gameOver) {       // if game is still running, reverse y-direction of birdie ???
            birdie.body.velocity.y = -FLAP;
            flapSnd.play();
        }
    }

    function spawnCloud() {    // draw a cloud to move across the screen
        cloudsTimer.stop();

        var cloudY = Math.random() * game.height / 2;
        var cloud = clouds.create(
            game.width,
            cloudY,
            'clouds',
            Math.floor(4 * Math.random())
        );
        var cloudScale = 2 + 2 * Math.random();
        cloud.alpha = 2 / cloudScale;
        cloud.scale.setTo(cloudScale, cloudScale);
        cloud.body.allowGravity = false;
        cloud.body.velocity.x = -SPEED / cloudScale;
        cloud.anchor.y = 0;

        cloudsTimer.start();
        cloudsTimer.add(4 * Math.random());
    }

    function o() {
        return OPENING + 60 * ((score > 50 ? 50 : 50 - score) / 50);
    }

    function spawnFinger(fingerY, flipped) {   //  individual finger setup for drawing
        var finger = fingers.create(
            game.width,
            fingerY + (flipped ? -o() : o()) / 2,
            'finger'
        );
        finger.body.allowGravity = false;

        // Flip finger! *GASP*
        finger.scale.setTo(2, flipped ? -2 : 2);
        finger.body.offset.y = flipped ? -finger.body.height * 2 : 0;

        // Move to the left
        finger.body.velocity.x = -SPEED;

        return finger;
    }

    function spawnFingers() {   // draw fingers to move across the screen
        fingersTimer.stop();

        var fingerY = ((game.height - 16 - o() / 2) / 2) + (Math.random() > 0.5 ? -1 : 1) * Math.random() * game.height / 6;

        // Bottom finger
        var botFinger = spawnFinger(fingerY);

        // Top finger (flipped)
        var topFinger = spawnFinger(fingerY, false);

        // Add invisible thingy
        var inv = invs.create(topFinger.x + topFinger.width, 0);
        inv.width = 2;
        inv.height = game.world.height;
        inv.body.allowGravity = false;
        inv.body.velocity.x = -SPEED;

        fingersTimer.start();
        fingersTimer.add(1 / SPAWN_RATE);
    }

    function addScore(_, inv) {     // set up the score box for printing
        invs.remove(inv);
        score += 1;
        scoreText.setText(score);
        scoreSnd.play();
    }

    function setGameOver() {     // prepare to reset variables for a new game
        gameOver = true;
        instText.setText("TOUCH BIRDIE\nTO TRY AGAIN");
        instText.renderable = true;
        var hiscore = window.localStorage.getItem('hiscore');
        hiscore = hiscore ? hiscore : score;
        hiscore = score > parseInt(hiscore, 10) ? score : hiscore;
        window.localStorage.setItem('hiscore', hiscore);
        gameOverText.setText("GAMEOVER\n\nHIGH SCORE\n" + hiscore);
        gameOverText.renderable = true;

        // Stop all finger movements by setting the x-velocity to zero
        fingers.forEachAlive(function(finger) {
            finger.body.velocity.x = 0;
        });
        invs.forEach(function(inv) {
            inv.body.velocity.x = 0;
        });

        // Stop spawning fingers
        fingersTimer.stop();

        // Make birdie reset the game
        birdie.events.onInputDown.addOnce(reset);
        hurtSnd.play();
    }

    function update() {                // update the screen periodically
        if (gameStarted) {

            // Make birdie dive
            var dvy = FLAP + birdie.body.velocity.y;
            birdie.angle = (90 * dvy / FLAP) - 180;
            if (birdie.angle < -30) {
                birdie.angle = -30;
            }
            if (gameOver || (birdie.angle > 90) || (birdie.angle < -90)) {
                birdie.angle = 90;
                birdie.animations.stop();
                birdie.frame = 3;
            }
            else {
                birdie.animations.play('fly');
            }

            // Birdie is DEAD!
            if (gameOver) {
                if (birdie.scale.x < 4) {
                    birdie.scale.setTo(
                        birdie.scale.x * 1.2,
                        birdie.scale.y * 1.2
                    );
                }
                // Shake game over text
                // gameOverText.angle = Math.random() * 5 * Math.cos(game.time.now / 100);
            }
            else {

                // Check game over
                game.physics.overlap(birdie, fingers, setGameOver);
                if (!gameOver && birdie.body.bottom >= game.world.bounds.bottom) {
                    setGameOver();
                }

                // Add score
                game.physics.overlap(birdie, invs, addScore);
            }
            // Remove offscreen fingers
            fingers.forEachAlive(function(finger) {
                if (finger.x + finger.width < game.world.bounds.left) {
                    finger.kill();
                }
            });

            // Update finger timer
            fingersTimer.update();
        }
        else {
            birdie.y = (game.world.height / 2) + 8 * Math.cos(game.time.now / 200);
        }
        if (!gameStarted || gameOver) {
            // Shake instructions text
            instText.scale.setTo(
                2 + 0.1 * Math.sin(game.time.now / 100),
                2 + 0.1 * Math.cos(game.time.now / 100)
            );
        }
        // Shake score text
        scoreText.scale.setTo(
            2 + 0.1 * Math.cos(game.time.now / 100),
            2 + 0.1 * Math.sin(game.time.now / 100)
        );
        cloudsTimer.update();

        // Remove offscreen clouds
        clouds.forEachAlive(function(cloud) {
            if (cloud.x + cloud.width < game.world.bounds.left) {
                cloud.kill();
            }
        });
        // Scroll fence
        if (!gameOver) {
            fence.tilePosition.x -= game.time.physicsElapsed * SPEED / 2;
        }
    }

    function render() {          // doesn’t do anything if DEBUG == false
        if (DEBUG) {
            game.debug.renderSpriteBody(birdie);
            fingers.forEachAlive(function(finger) {
                game.debug.renderSpriteBody(finger);
            });
            invs.forEach(function(inv) {
                game.debug.renderSpriteBody(inv);
            });
        }
    }
};
 
