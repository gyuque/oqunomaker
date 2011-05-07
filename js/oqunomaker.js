if (!window.gyuque) { window.gyuque ={}; }

(function(pkg){
	var theApp = null;
	var MasterScale = 0.36;
	var FourierParams = {
		body: {
			R: [567*0.5, 11    , 20    , 37    ,  17    ,  7      , 1      ,  3     , 1     , 3      , 0, 0.01],
			i: [0      , 1.9418, 3.0615, 1.6498, -3.0481, -0.10347, 0.84234, -1.0738, 1.7831, -2.7167, 0,    0],
			center: {x: 0, y: -16}
		},

		face: {
			R: [224*0.5, 0, 18   , 3     ,  2     ,  1      , 1      ],
			i: [0      , 0, 2.676, 0.5726, -1.5291, -0.72705, 0.68232],
			center: {x: -83*0.5, y: -206*0.5 -16}
		}
	};

	pkg.OqunoMaker = function(containerElement, size, onComplete) {
		this.onComplete = onComplete;
		this.centroid = {x: 0, y: 0, height: 0};
		this.canvasSize = size;
		this.containerElement = containerElement;
		this.buildView(containerElement, size);
		this.signStrokes = null;
		this.strokeTransform = new pkg.StrokeTransform();

		this.params = {
			phase_body_1: 0,
			phase_body_2: 0,
			body_scale: 1,
			body_scale_2: 1,
			phase_face_1: 0,
			phase_face_2: 0,
			face_scale: 1,
			rip_scale: 1.0,
			bodyColor: '#56a485',
			highlight: false,
			glassy: false
		};

		var i;
		this.defaultParams = {};
		for (i in this.params) {
			this.defaultParams[i] = this.params[i];
		}

		this.calcBasePosition(this.params);

		this.shift_body = new Array(FourierParams.body.R.length);
		this.radii_body = new Array(FourierParams.body.R.length);
		for (i = 0;i < this.radii_body.length;i++){ this.radii_body[i]=1; }

		this.shift_face = new Array(FourierParams.face.R.length);
		this.radii_face = new Array(FourierParams.face.R.length);
		for (i = 0;i < this.radii_face.length;i++){ this.radii_face[i]=1; }

		this.board = new pkg.DrawBoard(size, size >> 1, this);
		this.containerElement.appendChild(this.board.outerElement());
		this.board.fit();

		this.resetParams();
	};

	pkg.OqunoMaker.prototype = {
		onSignButton: function() {
			this.board.clear();
			this.board.show();
		},

		onDrawBoardOK: function(strokes) {
			this.signStrokes = strokes.slice();
			this.update();
		},

		calcBasePosition: function(p) {
			var dx = FourierParams.face.center.x - FourierParams.body.center.x;
			var dy = FourierParams.face.center.y - FourierParams.body.center.y;
			p.face_distance = Math.sqrt(dx*dx + dy*dy);
			p.face_angle = Math.atan2(dy, dx);

			this.makeOqunoPath(null, 
				FourierParams.face.R, FourierParams.face.i, 
				null, null, 0, 0, MasterScale, 90, this.centroid);
			p.face_base_height = this.centroid.height;
		},

		buildView: function(container) {
			var _this = this;
			container.innerHTML = "";
			container.style.position = "relative";

			var tbl = $H('table');
			var row1 = $H('tr');
			var col1 = $H('td');
			var col2 = $H('td', 'oqunomaker-col2');
			container.appendChild(tbl);
			tbl.appendChild(row1);
			row1.appendChild(col1);
			row1.appendChild(col2);

			this.offscreenCanvas = $H("canvas");
			this.offscreenCanvas.width = this.canvasSize;
			this.offscreenCanvas.height = this.canvasSize;

			this.canvas = $H("canvas", "oqunomaker-main-canvas");
			this.canvas.width = this.canvasSize;
			this.canvas.height = this.canvasSize;
			this.canvas.style.display = "block";
			col1.appendChild(this.canvas);

			// sign button
			var sbtn_outer = $H("div", "oqunomaker-sign-button");
			var sbtn_inner = $H("input");
			sbtn_inner.type = "image";
			sbtn_inner.src = "images/write-icon.png";
			sbtn_inner.title = "サインを入れる";
			add_css(".oqunomaker-sign-button input:active{opacity:0.5;} .oqunomaker-sign-button{width:24px; height:24px; margin-left: "+(this.canvasSize-32)+"px; margin-top: -32px; background: url(images/button-shadow.png) no-repeat top left}");
			sbtn_outer.appendChild(sbtn_inner);
			col1.appendChild(sbtn_outer);
			$(sbtn_inner).click(function(){
				_this.onSignButton();
			});

			var update_closure = function(){ _this.update(); };
			var opts = {
				change: update_closure,
				slide: update_closure,
				min: -99,
				max: 100
			};

			var addSlider = function() {
				var el = $H("div");
				col1.appendChild(el);
				return $(el).slider(opts);
			};

			var addRadio = function(target, labelText, val) {
				var el = $H('input');
				el.type = 'radio';
				el.name = 'oqunomaker-fill-type';
				el.value = val;

				var label = $H('label');
				label.appendChild(el);
				label.appendChild(document.createTextNode(labelText));
				target.appendChild(label);
				return el;
			};

			var slider2 = addSlider();
			var slider1 = addSlider();
			var slider3 = addSlider();
			var slider4 = addSlider();

			var slider5 = addSlider();
			var slider6 = addSlider();
			var slider7 = addSlider();

			var slider10 = addSlider();

			this.ph_sliders = [slider1, slider2, slider3, slider4];
			this.face_ph_sliders = [slider5, slider6, slider7];
			this.rip_slider = slider10;

			this.all_sliders = [slider1, slider2, slider3, slider4, slider5, slider6, slider7, slider10];

			this.g = this.canvas.getContext('2d');
			this.g2 = this.offscreenCanvas.getContext('2d');
			this.gradHighlight = this.g.createLinearGradient(0, (this.canvasSize >> 1) - FourierParams.body.R[0] * MasterScale, 0, (this.canvasSize >> 1) + FourierParams.body.R[0] * MasterScale);
			this.gradHighlight.addColorStop(0  , '#444');
			this.gradHighlight.addColorStop(0.37, '#1a1a1a');
			this.gradHighlight.addColorStop(0.5, '#000');

			this.gradFace = this.g.createLinearGradient(0, (this.canvasSize >> 1) - FourierParams.body.R[0] * MasterScale, 0, (this.canvasSize >> 1) + FourierParams.body.R[0] * MasterScale);
			this.gradFace.addColorStop(0.45, '#fff');
			this.gradFace.addColorStop(1, '#aaa');

			var cp = $H("div");
			this.bodyColorPicker = $(cp);
			this.bodyColorPicker.farbtastic(function(clr){
				_this.params.bodyColor = clr;
				_this.updateBodyGradient();
				_this.update();
			});
			col2.appendChild(cp);
			

			var effect_box = $H('form', 'oqunomaker-effect-sel');
			var radio_flat      = addRadio(effect_box, "平面", 'flat');
			radio_flat.checked = true;
			var radio_highlight = addRadio(effect_box, "光沢", 'resin');
			var radio_clear     = addRadio(effect_box, "透明感", 'glass');
			col2.appendChild(effect_box);
			this.fill_radios = $([radio_flat, radio_highlight, radio_clear]);
			this.fill_radios.click(function() {
				_this.update();
			});

			var resetbutton = $($H('button')).text("Reset").click(function() {
				_this.resetParams();
			});
			col2.appendChild(resetbutton[0]);
			col2.appendChild(document.createTextNode(' '));

			if (this.onComplete) {
				var completeButton = $($H('button')).text("Generate").click(function(){
					_this.onComplete(_this.canvas.toDataURL());
				});
				col2.appendChild(completeButton[0]);
			}
		},

		resetParams: function() {
			$('input[name=oqunomaker-fill-type]').val(['flat']);
			for (var i in this.all_sliders)
				this.all_sliders[i].slider('value', 0);

			this.params.bodyColor = this.defaultParams.bodyColor;
			this.updateBodyGradient();
			$.farbtastic(this.bodyColorPicker).setColor(this.params.bodyColor);
			this.update();
		},

		update: function() {
			var fillType = $('input[name=oqunomaker-fill-type]:checked').val();
			var scale = Math.PI / 100.0;

			this.params.phase_body_1 = this.ph_sliders[0].slider('value') * scale;
			this.params.phase_body_2 = this.ph_sliders[1].slider('value') * scale;
			this.params.body_scale   = 1.0 + this.ph_sliders[2].slider('value') / 100.0;
			this.params.body_scale_2 = 1.0 + this.ph_sliders[3].slider('value') * 5.0;
			this.params.phase_face_1 = this.face_ph_sliders[0].slider('value') * scale;
			this.params.phase_face_2 = this.face_ph_sliders[1].slider('value') * scale;
			this.params.face_scale = 1.0 + this.face_ph_sliders[2].slider('value') / 200.0;
			this.params.rip_scale = 1.0 + this.rip_slider.slider('value') / 200.0;

			this.shift_body[2] = this.params.phase_body_1;
			this.shift_body[3] = this.params.phase_body_2;
			this.radii_body[5] = this.params.body_scale;
			this.radii_body[11] = this.params.body_scale_2;

			this.shift_face[2] = this.params.phase_face_1;
			this.shift_face[3] = this.params.phase_face_2;
			this.radii_face[2] = this.params.face_scale;

			this.params.highlight = fillType != 'flat';
			this.params.glassy = fillType == 'glass';

			this.clear();
			this.draw();
		},

		updateBodyGradient: function() {
			this.bodyGradient = this.makeBodyGradient(this.g, this.params.bodyColor, (this.canvasSize >> 1), FourierParams.body.R[0] * MasterScale)
		},

		clear: function() {
			this.g.clearRect(0, 0, this.canvasSize, this.canvasSize);
		},

		draw: function() {
			var scale = MasterScale;
			var cx = this.canvasSize >> 1;
			var cy = this.canvasSize >> 1;

			var g = this.g;
			var f = FourierParams.body;
			g.fillStyle = this.params.highlight ? this.bodyGradient : this.params.bodyColor;
			g.save();
			if (this.params.highlight) {
				g.shadowOffsetY = 12 * scale;
				g.shadowBlur = 19 * scale;
				g.shadowColor = this.makeShadowColor(this.params.bodyColor);
			}
			g.beginPath();
			this.makeOqunoPath(this.g, f.R, f.i, this.radii_body, this.shift_body, cx + f.center.x*scale, cy + f.center.y*scale, scale, 180);
			g.fill();
			g.restore();


			if (this.params.highlight) {
				if (this.params.glassy)
					this.drawGlass(g, scale);

				this.drawHighlight(g, scale);
			}

			this.drawSign(this.g, f.R, f.i, this.radii_body, this.shift_body, cx + f.center.x*scale, cy + f.center.y*scale, scale, this.params.highlight ? 0.8 : 1);

			var fcx = f.center.x + Math.cos(this.params.face_angle - this.params.phase_body_2*0.3) * this.params.face_distance;
			var fcy = f.center.y + Math.sin(this.params.face_angle - this.params.phase_body_2*0.3) * this.params.face_distance;

			f = FourierParams.face;
			g.fillStyle = this.params.highlight ? this.gradFace : '#fff';
			g.beginPath();
			g.save();
			g.translate(0, fcy*scale);
			this.makeOqunoPath(g, f.R, f.i, this.radii_face, this.shift_face, cx + fcx*scale, cy, scale, 90, this.centroid);
			g.fill();

			this.drawFace(g, this.centroid, scale, this.params.rip_scale);
			g.restore();
		},

		makeBodyGradient: function(g, baseColor, cy, h) {
			var f = $.farbtastic(this.bodyColorPicker);
			var rgb = f.unpack(baseColor);
			rgb[0] *= 0.7; rgb[1] *= 0.7; rgb[2] *= 0.7;
			var darken = f.pack(rgb);

			var grad = g.createLinearGradient(0, cy - h, 0, cy + h);
			grad.addColorStop(0.5, baseColor);
			grad.addColorStop(1, darken);

			return grad;
		},

		makeShadowColor: function(baseColor) {
			var f = $.farbtastic(this.bodyColorPicker);
			var rgb = f.unpack(baseColor);
			rgb[0] = Math.floor(rgb[0] * 70);
			rgb[1] = Math.floor(rgb[1] * 70);
			rgb[2] = Math.floor(rgb[2] * 70);
			return 'rgba('+rgb.join(',')+', 0.5)';
		},

		drawHighlight: function(g) {
			var scale = MasterScale;
			var cx = this.canvasSize >> 1;
			var cy = this.canvasSize >> 1;
			var f = FourierParams.body;
			var old_op = g.globalCompositeOperation;
			g.globalCompositeOperation = "lighter";

			g.save();
			g.beginPath();
			g.moveTo(0,0);
			g.lineTo(0,cy);
			this.makeSplitPath(g, f.R, f.i, this.radii_body, this.shift_body, cx + f.center.x*scale, cy + f.center.y*scale, scale);
			g.lineTo(cx*2,cy);
			g.lineTo(cx*2,0);
			g.clip();

			g.fillStyle = this.gradHighlight;
			g.beginPath();
			this.makeOqunoPath(g, f.R, f.i, this.radii_body, this.shift_body, cx + f.center.x*scale, cy + f.center.y*scale, scale * 0.983, 180);
			g.fill();
			g.restore();


			g.globalCompositeOperation = old_op;
		},

		drawGlass: function(g, scale) {
			var scale = MasterScale;
			var cx = this.canvasSize >> 1;
			var cy = this.canvasSize >> 1;
			var f = FourierParams.body;

			var fab = $.farbtastic(this.bodyColorPicker);
			var rgb = fab.unpack(this.params.bodyColor);
			rgbL = [rgb[0]*0.3 + 0.3, rgb[1]*0.3 + 0.3, rgb[2]*0.3 + 0.3];
			var lighter = fab.pack(rgbL);
			rgb[0] *= 0.8; rgb[1] *= 0.8; rgb[2] *= 0.8;
			var darken = fab.pack(rgb);

			g.save();
			g.beginPath();
			this.makeOqunoPath(g, f.R, f.i, this.radii_body, this.shift_body, cx + f.center.x*scale, cy + f.center.y*scale, scale, 180);
			g.clip();

			g.shadowColor = darken;
			g.fillStyle = darken;
			g.beginPath();
			this.makeOqunoPath(g, f.R, f.i, this.radii_body, this.shift_body, cx + f.center.x*scale, cy + (f.center.y-33)*scale, scale*0.4, 100);
			g.shadowBlur = f.R[0] * scale * 0.8;
			g.fill(); g.fill();
			g.shadowBlur = f.R[0] * scale * 0.6;
			g.fill(); g.fill();
			g.shadowBlur = f.R[0] * scale * 0.4;
			g.fill();
			g.shadowBlur = f.R[0] * scale * 0.1;
			g.fill();

			g.beginPath();
			g.moveTo(-32,0);
			g.lineTo(-32,this.canvasSize+32);
			g.lineTo(this.canvasSize+32,this.canvasSize+32);
			g.lineTo(this.canvasSize+32, 0);
			this.makeOqunoPath(g, f.R, f.i, this.radii_body, this.shift_body, cx + f.center.x*scale, cy + (f.center.y-22)*scale, scale*1.1, 90);
			g.fillStyle='#000';
			g.shadowBlur = f.R[0] * scale * 0.4;
			g.shadowColor = lighter;
			g.shadowOffsetY = -f.R[0] * scale * 0.15;
			g.globalCompositeOperation = "lighter";
			g.fill();
			g.restore();
		},

		drawFace: function(g, center, scale, rip_scale) {
			var hscale = center.height / this.params.face_base_height;

			this.drawEye(g, center.x - 45*scale, center.y - 35*scale * hscale, 10 * scale);
			this.drawEye(g, center.x + 45*scale, center.y - 35*scale * hscale, 10 * scale);
			this.drawRip(g, center.x - 7*scale, center.y + 45*scale * hscale, 26 * scale, rip_scale);
		},

		drawRip: function(g, cx, cy, size, rip_scale) {
			g.fillStyle = "#e33";
			g.beginPath();
			g.moveTo(cx-size * rip_scale, cy);
			g.quadraticCurveTo(cx+size*0.2 * rip_scale, cy+size*0.9, cx+size * rip_scale, cy);
			g.quadraticCurveTo(cx+size*0.2 * rip_scale, cy+size*0.4, cx-size * rip_scale, cy);
			g.fill();
			g.restore();
		},

		drawEye: function(g, cx, cy, size) {
			g.fillStyle = "#000";
			g.beginPath();
			g.arc(cx, cy, size, 0, Math.PI*2, false);
			g.fill();

			cx -= size * 0.2;
			cy -= size * 0.2;
			g.fillStyle = "#fff";
			g.beginPath();
			g.arc(cx, cy, size*0.5, 0, Math.PI*2, false);
			g.fill();
		},

		drawSign: function(g, Rs, is, rMods, iShifts, cx, cy, radius, strokeAlpha) {
			if (!this.bottomYMap) { this.bottomYMap = new Array(this.canvasSize); }

			var i;
			var ymap = this.bottomYMap;
			var mlen = ymap.length;
			for (i = 0;i < mlen;i++) {
				ymap[i] = -1;
			}

			var hm = mlen >> 1;
			var DIVS = 100;
			var DPI = Math.PI * 2.0;
			for (var k = 0;k < DIVS;k++) {
				var t = (k / (DIVS-1));
				var a = Math.asin(t*2.0 - 1.0);
				var rd  = this.iFT(Math.PI-a, Rs, is, rMods, iShifts);
				var rd2 = this.iFT(Math.PI-a-0.1, Rs, is, rMods, iShifts);
				var y = -Math.cos(Math.PI-a) * rd * radius;
				var x  =  Math.sin(Math.PI-a) * rd * radius;
				var x2 =  Math.sin(Math.PI-a-0.1) * rd2 * radius;
				if (x < x2) {
					var ax = Math.floor(x + hm);
					if (ax >= 0 && ax < mlen) {
						if (y > ymap[ax]) {
							ymap[ax] = y;
						}
					}
				}
			}

			var prevx = -1;
			for (i = 0;i < (mlen-1);i++) {
				if (ymap[i] >= 0 && ymap[i+1] < 0) {
					prevx = i;
				} else if (ymap[i] < 0 && ymap[i+1] >= 0) {
					if (prevx >= 0) {
						this.intpArray(ymap, prevx, i+1);
					}
				}
			}

			var dy;
			var dyLimit = this.canvasSize >> 6;
			var rightEnd = 0;
			var leftEnd = mlen-1;
			for (i = 0;i < (mlen>>2);i++) {
				dy = ymap[i] - ymap[i+1];
				if (dy<0){dy = -dy}

				if (dy <= dyLimit && ymap[i] >= 0) {
					leftEnd = i;
					break;
				}
			}

			for (i = (mlen-1);i > (mlen-(mlen>>2));i--) {
				dy = ymap[i] - ymap[i-1];
				if (dy<0){dy = -dy}

				if (dy <= dyLimit && ymap[i] >= 0) {
					rightEnd = i;
					break;
				}
			}

/*
			console.log(leftEnd+'  '+rightEnd);

			g.fillStyle = "#f00";
			for (i = 0;i < mlen;i++) {
				if (ymap[i] >= 0)
					g.fillRect(i, cy + ymap[i]-2, 1, 3);
			}
*/

			if (this.signStrokes) {
				this.g2.clearRect(0, 0, this.canvasSize, this.canvasSize);

				this.strokeTransform.leftEnd = leftEnd;
				this.strokeTransform.cy = Math.floor(this.canvasSize * 0.4);
				this.strokeTransform.scaleX = (rightEnd-leftEnd)/mlen;
				this.strokeTransform.scaleY = 1.1;
				this.strokeTransform.yTable = ymap;
				for (i = 0;i < this.signStrokes.length;i++) {
					this.board.renderStroke(this.g2, this.signStrokes[i], "#fff", this.strokeTransform);
				}

				g.save();
				g.globalAlpha = strokeAlpha;
				var ptn = g.createPattern(this.offscreenCanvas, "repeat");
				g.fillStyle = ptn;
				g.fillRect(0, 0, this.canvasSize, this.canvasSize);
				g.restore();
			}
		},

		intpArray: function(a, p1, p2) {
			var len = (p2-p1) - 1;
			if (len < 1) return;

			var v1 = a[p1];
			var v2 = a[p2];
			for (var i = 0;i < len;i++) {
				var t = (i+1) / (len+1);
				a[p1 + i + 1] = v1 * (1.0 - t) + v2 * t;
			}
		},

		iFT: function(a, Rs, is, rMods, iShifts) {
			var plen = Rs.length;
			var r = Rs[0];
			for (var p = 1;p < plen;p++) {
				r += Math.cos(a * p + is[p] + (iShifts ? (iShifts[p] || 0) : 0)) * Rs[p] * (rMods ? rMods[p] : 1);
			}

			return r;
		},

		makeSplitPath: function(g, Rs, is, rMods, iShifts, cx, cy, radius) {
			var DIVS = 4;
			var DPI = Math.PI * 2.0;

			var mxs = [];
			var mys = [];
			var mx;
			var my;

			for (var k = 0;k < DIVS;k++) {
				var t = (k / (DIVS-1));
				var a = Math.asin(t*2.0 - 1.0);
				var rd1 = this.iFT(a, Rs, is, rMods, iShifts) * radius;
				var rd2 = this.iFT(Math.PI-a, Rs, is, rMods, iShifts) * radius;

				var y1 = -Math.cos(a) * rd1 + cy;
				var x1 =  Math.sin(a) * rd1 + cx;

				var y2 = -Math.cos(Math.PI-a) * rd2 + cy;
				var x2 =  Math.sin(Math.PI-a) * rd2 + cx;

				mx = x1 * 0.6 + x2 * 0.4;
				my = y1 * 0.6 + y2 * 0.4;

				mxs.push(mx);
				mys.push(my);
			}

			g.lineTo(mxs[0], mys[0])
			g.bezierCurveTo(
				mxs[1], mys[1], 
				mxs[2], mys[2], 
				mxs[3], mys[3]);
		},

		makeOqunoPath: function(g, Rs, is, rMods, iShifts, cx, cy, radius, DIVS, c_out) {
			var DPI = Math.PI * 2.0;
			var mx = 0;
			var my = 0;

			var miny = 9999;
			var maxy = -9999;

			for (var k = 0;k < DIVS;k++) {
				var a = (k / DIVS) * DPI;
				var rd = this.iFT(a, Rs, is, rMods, iShifts);

				rd *= radius;
				var y = -Math.cos(a) * rd + cy;
				var x =  Math.sin(a) * rd + cx;

				mx += x;
				my += y;

				if (miny > y) {miny = y;}
				if (maxy < y) {maxy = y;}

				if (g) {
					if (!k) {
						g.moveTo(x, y);
					} else {g.lineTo(x, y);}
				}
			}

			if (c_out) {
				c_out.x = mx / DIVS;
				c_out.y = my / DIVS;
				c_out.height = maxy - miny;
			}
		}
	};

	pkg.StrokeTransform = function() {
		this.scaleX = 1;
		this.scaleY = 1;
		this.leftEnd = 0;
		this.cy = 0;
		this.yTable = null;
	};

	pkg.StrokeTransform.prototype = {
		setYTable: function() {
		},

		transformX: function(x) {
			return x  * this.scaleX + this.leftEnd;
		},

		transformY: function(x, y, h) {
			var t = y/h * 0.5 + 0.5;
			return this.cy + (this.yTable[Math.floor(this.transformX(x))] * t * t + y*(1.0-t)) * this.scaleY;
		}
	};

	// ========================= DrawBoard ===========================
	pkg.DrawBoard = function(w, h, lsn) {
		this.listener = lsn;
		this.width = w;
		this.height = h;
		this.lineWidth = 6.0;
		var _this = this;

		this.pageOrigin = {x:0,y:0};
		this.outer  = $H('div', 'oqunomaker-drawboard-outer');
		this.canvas = $H('canvas', 'oqunomaker-drawboard');
		this.g = this.canvas.getContext('2d');
		this.outer.appendChild(this.canvas);
		this.outer.addEventListener('mousedown', function(e){ e.preventDefault();}, false);

		this.dragging = false;
		var cv = this.canvas;
		cv.width = w;
		cv.height = h;
		cv.style.background = "#fff";
		cv.style.border = "1px solid #000";
		cv.style.boxShadow = "0 1px 1px #000";
		$(cv).mousedown(function(e){ _this.onMouseDown(e); }).
		      mousemove(function(e){ _this.onMouseMove(e); }).
		      mouseleave(function(e){ _this.onMouseLeave(e); }).
		      mouseup(function(e){ _this.onMouseUp(e); });

		var os = this.outer.style;
		os.width = "100%";
		os.position = "absolute";
		os.top = "0";
		os.left = "0";
		os.zIndex = "2";
		os.textAlign = "center";
		os.backgroundColor="rgba(0,0,0,0.4)";
		
		os.display = "none";

		var buttonBox = $H('div', 'oqunomaker-drawboard-buttons');
		var btnOK = $H('button');
		$(btnOK).text("OK").click(function(){
			_this.close();
			if (_this.listener) {
				_this.listener.onDrawBoardOK(_this.strokes);
			}
		}).css("background-color", "#3e5");

		var btnClear = $H('button');
		$(btnClear).text("消す").click(function(){
			_this.clear();
		});

		var btnCancel = $H('button');
		$(btnCancel).text("キャンセル").click(function(){
			_this.close();
		}).css("margin", "9px");

		buttonBox.appendChild(btnClear);
		buttonBox.appendChild(btnCancel);
		buttonBox.appendChild(btnOK);
		this.outer.appendChild(buttonBox);

		this.strokes = [];
		this.currentStroke = null;
		this.strokeCache = null;
		this.clear();
	};

	pkg.DrawBoard.prototype = {
		show: function() {
			this.outer.style.display = "";
		},

		close: function() {
			this.outer.style.display = "none";
		},

		clear: function() {
			this.strokes.length = 0;
			this.currentStroke = null;
			if (this.strokeCache)
				this.strokeCache = null;
			this.updateCache();
		},

		updateOriginPosition: function () {
			var pos = $(this.canvas).offset();
			this.pageOrigin.x = pos.left;
			this.pageOrigin.y = pos.top;
		},

		onMouseDown: function(e) {
			this.updateOriginPosition();
			var x = e.pageX - this.pageOrigin.x;
			var y = e.pageY - this.pageOrigin.y;
			this.dragging = true;
			this.newStroke(x, y);
		},

		onMouseLeave: function(e) {
			this.stopStroke();
		},

		onMouseMove: function(e) {
			if (this.dragging) {
				this.updateOriginPosition();
				var x = e.pageX - this.pageOrigin.x;
				var y = e.pageY - this.pageOrigin.y;
				this.appendPoint(x, y);
			}
		},

		onMouseUp: function(e) {
			this.stopStroke();
		},


		outerElement: function() {
			return this.outer;
		},

		newStroke: function(x, y) {
			this.commitStroke();
			this.currentStroke = [x, y, 0];
		},

		stopStroke: function() {
			this.dragging = false;
			this.commitStroke();
		},

		appendPoint: function(x, y) {
			if (this.currentStroke) {
				var len = this.currentStroke.length;
				var dx = x - this.currentStroke[len-3];
				var dy = y - this.currentStroke[len-2];
				if ((dx*dx + dy*dy) >= 8) {
					this.currentStroke.push(x, y, 0);
					this.updateView();
				}
			}
		},

		commitStroke: function() {
			if (this.currentStroke) {
				this.strokes.push(this.currentStroke);
				this.updateCache();
				this.currentStroke = null;
			}
		},

		updateCache: function() {
			var g = this.g;
			this.updateView(true);
			if (!this.strokeCache) {
				this.strokeCache = new Image();
			}

			var _this = this;
			this.strokeCache.onload = function(){
				_this.updateView();
			};
			this.strokeCache.src = this.canvas.toDataURL();
		},

		updateView: function(fgonly) {
			var g = this.g;
			g.clearRect(0, 0, this.width, this.height);
			if (!fgonly) {
				g.fillStyle = "#ddd";
				g.fillRect(0, this.height >> 1, this.width, 1);
				g.fillRect(this.width >> 1, 0, 1, this.height);
			}

			if (this.strokeCache) {
				g.drawImage(this.strokeCache, 0, 0);
			}

			if (this.currentStroke) {
				this.renderStroke(g, this.currentStroke);
			}
		},

		renderStroke: function(g, coords, style, transform) {
			var len = coords.length / 3;
			if (len < 2)
				return;
			var prev_w = 0;
			this.makeWidth(coords);

			var ox;
			var oy;
			var original_x;
			g.lineCap = 'round';
			g.lineJoin = 'round';
			g.strokeStyle = style || "#000";
			for (i = 0;i < len;i++) {
				var x = coords[i*3  ];
				var y = coords[i*3+1];

				if (transform) {
					original_x = x;
					x = transform.transformX(x);
					y = transform.transformY(original_x, y, this.height);
				}

				var w = coords[i*3+2] * this.lineWidth;

				if (w != prev_w && i) {
					g.stroke();
					g.lineWidth = w;
					g.beginPath();
					g.moveTo(ox, oy);
				}

				prev_w = w;
				if (i) {
					g.lineTo(x, y);
				} else {
					g.beginPath();
					g.moveTo(x, y);
				}

				ox = x;
				oy = y;
			}
			g.stroke();
		},

		makeWidth: function(coords) {
			var len = coords.length / 3;
			var i;
			var ox = coords[0];
			var oy = coords[1];
			var all_len = 0;

			if (len > 0) {
				for (i = 0;i < len;i++) {
					var dx = coords[i*3  ] - ox;
					var dy = coords[i*3+1] - oy;
					ox = coords[i*3  ];
					oy = coords[i*3+1];
					all_len += Math.sqrt(dx*dx + dy*dy);
					coords[i*3+2] = all_len;
				}

				for (i = 0;i < len;i++) {
					var u = coords[i*3+2] * 0.05;
					var v = all_len * 0.05 - u;
					if (u > 1.0) u = 1.0;
					if (v > 1.0) v = 1.0;
					coords[i*3+2] = (u<v) ? u : v;
				}
			}
		},

		fit: function() {
			var o = this.outer;
			var h = $(o.parentNode).height() >> 0;
			o.style.height = h + "px";
			this.canvas.style.marginTop = (((h-this.height)>>1)-24)+ "px";
		}
	};


	// =========================== launch ============================
	pkg.launch_oqunomaker = function(box_id, onComplete) {
		theApp = new pkg.OqunoMaker(document.getElementById(box_id), 256, onComplete);
	};

	// ============================ utils ============================
	var $H = function(t, cls) {
		var elm = document.createElementNS("http://www.w3.org/1999/xhtml", t);
		if (cls){elm.className = cls;}
		return elm;
	};

	function add_css(css) {
		var s = $H('style');
		s.type = "text/css";
		s.appendChild(document.createTextNode(css));
		$('head')[0].appendChild(s);
	}
})(gyuque);