/**
 * class PixiRenderer < Renderer
 *
 * Physics.renderer('pixi')
 *
 * Renderer that uses the PIXI.js library. [Documentation can be found here](https://github.com/wellcaffeinated/PhysicsJS/wiki/PIXI-Renderer).
 *
 * Additional config options:
 *
 * - debug: Draw debug shapes and bounding boxes. (default: `false`)
 * - metaEl: HTMLElement to write meta information like FPS and IPF into. (default: autogenerated)
 * - offset: Offset the shapes by this amount. (default: `{ x: 0, y: 0 }`)
 * - styles: Styles to use to draw the shapes. (see below)
 *
 * The styles property should contain _default_ styles for each shape you want to draw.
 *
 * Example:
 *
 * ```javascript
 * styles: {
 *    // Defines the default canvas colour
 *    'color': '0x66FF99',
 *
 *    'circle' : {
 *        strokeStyle: '0xE8900C',
 *        lineWidth: 3,
 *        fillStyle: '0xD5DE4C',
 *        angleIndicator: '0xE8900C'
 *    },
 *
 *    'convex-polygon' : {
 *        strokeStyle: '0xE8900C',
 *        lineWidth: 3,
 *        fillStyle: '0xD5DE4C',
 *        angleIndicator: '0xE8900C'
 *    }
 * }
 * ```
 **/
/* global PIXI */
Physics.renderer('pixi', function( parent ){

    if ( !document ){
        // must be in node environment
        return {};
    }

    var Pi2 = Math.PI * 2;

    var defaults = {

        // draw aabbs of bodies for debugging
        debug: false,
        // the element to place meta data into
        metaEl: null,
        offset: { x: 0, y: 0 },
        // Provide some default colours
        styles: {
            // Defines the default canvas colour
            'color': '0x66FF99',

            'point' : '0xE8900C',

            'circle' : {
                strokeStyle: '0xE8900C',
                lineWidth: 3,
                fillStyle: '0xD5DE4C',
                angleIndicator: '0xE8900C'
            },

            'convex-polygon' : {
                strokeStyle: '0xE8900C',
                lineWidth: 3,
                fillStyle: '0xD5DE4C',
                angleIndicator: '0xE8900C'
            }
        }
    };

    return {

        // extended
        init: function( options ){

            var self = this;

            if (typeof PIXI === 'undefined') {
                throw "PIXI obj not present - cannot continue ";
            }

            // call parent init
            parent.init.call(this, options);

            // further options
            this.options.defaults( defaults, true );
            this.options.onChange(function(){
                self.options.offset = Physics.vector( self.options.offset );
            });
            this.options( options, true );

            // Hook in PIXI stage here
            this.stage = new PIXI.Stage(this.options.styles.color);
            this.renderer = new PIXI.autoDetectRenderer(this.options.width, this.options.height);

            // Create empty meta object for use later
            this.meta = {};

            // add the renderer view element to the DOM according to its type
            if ( this.el.nodeName === 'CANVAS' ){
                this.renderer = new PIXI.autoDetectRenderer(this.options.width, this.options.height, this.el);
            } else {
                this.renderer = new PIXI.autoDetectRenderer(this.options.width, this.options.height);

                if ( this.el !== null ) {
                    this.el.appendChild(this.renderer.view);
                } else {
                    document.body.appendChild(this.renderer.view);
                }
            }
        },

        /**
         * PixiRenderer#loadSpriteSheets( assetsToLoad, callback ) -> this
         * - assetsToLoad (Array): Array of spritesheets to load
         * - callback (Function): Function to call when loading is complete
         *
         * Loads textures defined in a spritesheet
         **/
        loadSpriteSheets: function( assetsToLoad, callback ){

            if ( !Physics.util.isArray( assetsToLoad ) ) {
                throw 'Spritesheets must be defined in arrays';
            }

            var self = this
                ,loader = new PIXI.AssetLoader(assetsToLoad)
                ;

            // Start loading resources!
            loader.load();

            loader.on('onComplete', function(evt){
                self.assetsLoaded = true;
                callback();
            });

            return self;
        },

        /**
         * PixiRenderer#drawBody( body, view )
         * - body (Body): The body to draw
         * - view (DisplayObject): The pixi display object
         *
         * Draw a PIXI.DisplayObject to the stage.
         **/
        drawBody: function( body, view ){
            var pos = body.state.pos
                ,v = body.state.vel
                ,t = this._interpolateTime || 0
                ,x
                ,y
                ,ang
                ;

            // interpolate positions
            x = pos.x + v.x * t;
            y = pos.y + v.y * t;
            ang = body.state.angular.pos + body.state.angular.vel * t;

            view.position.x = x;
            view.position.y = y;
            view.rotation = ang;
        },

        // extended
        render: function( bodies, meta ){

            parent.render.call(this, bodies, meta);
            this.renderer.render(this.stage);
        },

        /**
         * PixiRenderer#createCircle( x, y, r, style ) -> PIXI.Graphics
         * - x (Number): The x coord
         * - y (Number): The y coord
         * - r (Number): The circle radius
         * - style (Object): The styles configuration
         * + (PIXI.Graphics): A graphic object representing a circle.
         *
         * Create a circle for use in PIXI stage
         **/
        createCircle: function( x, y, r, style ){

            var graphics = new PIXI.Graphics();
            graphics.beginFill(style.fillStyle);
            graphics.lineStyle(style.lineWidth, style.strokeStyle);
            graphics.drawCircle(x, y, r);
            // Center the graphics to the circle
            graphics.pivot.x = (x / 2) + (r / 2);
            graphics.pivot.y = (y / 2) + (r / 2);
            return graphics;
        },

        /**
         * PixiRenderer#createPolygon( verts, style ) -> PIXI.Graphics
         * - verts (Array): Array of [[Vectorish]] vertices
         * - style (Object): The styles configuration
         * + (PIXI.Graphics): A graphic object representing a polygon.
         *
         * Create a polygon for use in PIXI stage
         **/
        createPolygon: function( verts, styles ){

            var vert = verts[0]
                ,x = vert.x
                ,y = vert.y
                ,l = verts.length
                ,start = {
                    x: x
                    ,y: y
                }
                ,graphics = new PIXI.Graphics()
                ;

            graphics.beginFill(styles.fillStyle);
            graphics.lineStyle(styles.lineWidth, styles.strokeStyle);

            graphics.moveTo(x, y);

            for ( var i = 1; i < l; ++i ){

                vert = verts[ i ];
                x = vert.x;
                y = vert.y;
                graphics.lineTo(x, y);
            }

            if (l > 2){
                graphics.lineTo(start.x, start.y);
            }

            graphics.endFill();
            return graphics;
        },

        /**
         * PixiRenderer#createLine( from, to, style ) -> PIXI.Graphics
         * - from (Vectorish): Starting point
         * - to (Vectorish): Ending point
         * - style (Object): The styles configuration
         * + (PIXI.Graphics): A graphic object representing a polygon.
         *
         * Create a line for use in PIXI stage
         **/
        createLine: function( from, to, styles ){

            var x = from.x
                ,y = from.y
                ;

            var graphics = new PIXI.Graphics();
            graphics.beginFill(styles.fillStyle);
            graphics.lineStyle(styles.lineWidth, styles.strokeStyle);

            graphics.moveTo(x, y);

            x = to.x;
            y = to.y;

            graphics.lineTo(x, y);

            graphics.endFill();
            return graphics;
        },

        // extended
        createView: function( geometry ){

            var view = null
                ,aabb = geometry.aabb()
                ,hw = aabb.hw + Math.abs(aabb.x)
                ,hh = aabb.hh + Math.abs(aabb.y)
                ,x = hw + 1
                ,y = hh + 1
                ,name = geometry.name
                ;

            var styles = styles || this.options.styles[ name ];

            x += styles.lineWidth | 0;
            y += styles.lineWidth | 0;

            if (name === 'circle'){

                view = this.createCircle(x, y, geometry.radius, styles);

            } else if (name === 'convex-polygon'){

                view = this.createPolygon(geometry.vertices, styles);
            }

            if (styles.angleIndicator){

                view.beginFill(styles.angleIndicator);
                view.moveTo((x / 2), (5 + styles.lineWidth));
                view.lineTo((x / 2) + (geometry.radius / 2), geometry.radius);
                // Center the graphics to the circle
                view.endFill();

            }
            if (view) {
                this.stage.addChild(view);
                return view;
            } else {
                throw "Invalid view name passed.";
            }

        },

        // extended
        drawMeta: function( meta ){
            if (!this.meta.loaded){
                // define the font style here
                var fontStyles = {
                    font: "18px Snippet",
                    fill: "white",
                    align: "left"
                };
                this.meta.fps = new PIXI.Text('FPS: ' + meta.fps.toFixed(2), fontStyles);
                this.meta.fps.position.x = 15;
                this.meta.fps.position.y = 5;

                this.meta.ipf = new PIXI.Text('IPF: ' + meta.ipf, fontStyles);
                this.meta.ipf.position.x = 15;
                this.meta.ipf.position.y = 30;

                this.stage.addChild(this.meta.fps);
                this.stage.addChild(this.meta.ipf);
                this.meta.loaded = true;
            } else {
                this.meta.fps.setText('FPS: ' + meta.fps.toFixed(2));
                this.meta.ipf.setText('IPF: ' + meta.ipf);
            }
        },

        /**
         * PixiRenderer#createDisplay( type, options ) -> PIXI.DisplayObject
         * - type (String): The type of PIXI.DisplayObject to make
         * - options (Object): Options to apply to the view.
         * + (PIXI.DisplayObject): An object that is renderable.
         *
         * Create a PIXI sprite or movie clip.
         **/
        createDisplay: function( type, options ){
            var view = null
                ,texture = null
                ;
            switch (type){
                // Create a sprite object
                case 'sprite':
                    texture = PIXI.Texture.fromImage(options.texture);
                    view = new PIXI.Sprite(texture);
                    if (options.anchor ) {
                        view.anchor.x = options.anchor.x;
                        view.anchor.y = options.anchor.y;
                    }
                    // If a container is specified, use add to that container
                    if (options.container) {
                        options.container.addChild(view);
                    } else {
                        // Otherwise just add the view to the stage
                        this.stage.addChild(view);
                    }
                    return view;
                // Create a movieclip object
                case 'movieclip':
                    if (!this.assetsLoaded) {
                        throw "No assets have been loaded. Use loadSpritesheet() first";
                    }
                    var tex = []
                        ,i = 0
                        ;
                    // Populate our movieclip
                    for (i; i < options.frames.length; i++) {
                        texture = PIXI.Texture.fromFrame(options.frames[i]);
                        tex.push(texture);
                    }
                    view = new PIXI.MovieClip(tex);
                    if (options.anchor ) {
                        view.anchor.x = options.anchor.x;
                        view.anchor.y = options.anchor.y;
                    }
                    // If a container is specified, use add to that container
                    if (options.container) {
                        options.container.addChild(view);
                    } else {
                        // Otherwise just add the view to the stage
                        this.stage.addChild(view);
                    }
                    return view;
                // Create a default case
                default:
                    throw 'Invalid PIXI.DisplayObject passed';
            }
        },

        /**
         * PixiRenderer#centerAnchor( view )
         * - view (PIXI.DisplayObject): The view to center
         *
         * Centers the anchor to {x: 0.5, y: 0.5} of a view
         **/
        centerAnchor: function( view ) {
            if (view !== null){
                view.anchor.x = 0.5;
                view.anchor.y = 0.5;
            }
        }
    };
});
