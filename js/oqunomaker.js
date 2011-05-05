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

		this.resetParams();
	};

	pkg.OqunoMaker.prototype = {
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
			container.innerHTML = "";

			var tbl = $H('table');
			var row1 = $H('tr');
			var col1 = $H('td');
			var col2 = $H('td', 'oqunomaker-col2');
			container.appendChild(tbl);
			tbl.appendChild(row1);
			row1.appendChild(col1);
			row1.appendChild(col2);

			this.canvas = $H("canvas", "oqunomaker-main-canvas");
			this.canvas.width = this.canvasSize;
			this.canvas.height = this.canvasSize;
			col1.appendChild(this.canvas);

			var _this = this;
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
			g.moveTo(0,0);
			g.lineTo(0,this.canvasSize);
			g.lineTo(this.canvasSize,this.canvasSize);
			g.lineTo(this.canvasSize, 0);
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

	pkg.launch_oqunomaker = function(box_id, onComplete) {
		theApp = new pkg.OqunoMaker(document.getElementById(box_id), 256, onComplete);
	};

	// ============================ utils ============================
	var $H = function(t, cls) {
		var elm = document.createElementNS("http://www.w3.org/1999/xhtml", t);
		if (cls){elm.className = cls;}
		return elm;
	};
})(gyuque);