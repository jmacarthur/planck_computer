'use strict';


var decoder_timing = [ [0, 0.1, 1, 0.1 ] ];
var regen_timing = [ [1, 0.1, 0.1, 0 ] ];
var acc_reset_timing = [ [0.3, 0.1, 0, 0 ] ];
var instruction_holdoff_timing = [ [0.2, 0.1, 1, 0], [1.3,0.1,1,0], [2.6, 0.1,1,0] ];
var null_timing = [ [0, 0.1, 0.1, 0.1 ]];


function merge(original_hash, added_hash) {
    Object.keys(added_hash).forEach(function(key) {
	original_hash[key] = added_hash[key];
    });
    return original_hash;
}

function addFixture(body, shape, physics, collisions) {
    var properties = {shape: shape};
    merge(properties, physics);
    merge(properties, collisions);
    return body.createFixture(properties);
}

function addUnionFixture(body, shape, physics, collisions) {
    var properties = {shape: shape};
    merge(properties, physics);
    merge(properties, collisions);

    if('union_shapes' in body) {
	body.union_shapes.push(shape);
    } else {
	body.union_shapes = [shape];
    }
    return body.createFixture(properties);
}

function completeUnion(body) {
    var union_shape = new Polygon();
    union_shape.m_vertices = union(body.union_shapes);
    body.shapeOverride = [union_shape];
}

function box(x, y, width, height) {
    return new Polygon([Vec2(x,y), Vec2(x+width,y), Vec2(x+width,y+height), Vec2(x, y+height)]);
}

var mass_none = {
    density: 0.0,
    friction: 0.3
}

var mass_normal =  {
    density: 1.0,
    friction: 0.3
}

var collisions_none = {
    filterCategoryBits: 0x01,
    filterMaskBits: 0,
    filterGroupIndex: -1
}

var collisions_toplayer = {
    filterCategoryBits: 0x01,
    filterMaskBits: 0xFFFF,
    filterGroupIndex: 0
}

var collisions_topstatic = {
    filterCategoryBits: 0x02,
    filterMaskBits: 0x03,
    filterGroupIndex: 0
}

// for moving objects which do not collide with topstatic but collide with everything else
var collisions_topbehind = {
    filterCategoryBits: 0x04,
    filterMaskBits: 0x04 + 0x01,
    filterGroupIndex: 0
}

function translate_points(polygon, offsetx, offsety) {
    var newpoints = [];
    for(var i=0; i<polygon.length; i++) {
	var v = polygon[i];
	newpoints.push(new Vec2(v.x+offsetx, v.y+offsety));
    }
    return newpoints;
}

function hMirror(polygon) {
    var newpoints = [];
    for(var i=0; i<polygon.length; i++) {
	var v = polygon[i];
	newpoints.push(new Vec2(-v.x, v.y));
    }
    return newpoints;
}

function create_crank(world, ground, x, y, initial_rotation) {
    // Rotation in radians. Zero rotation is an 'L' shape going up and left from the origin.
    var crank = world.createBody({type: "dynamic", position: new Vec2(x, y)});
    addFixture(crank, box(-0.5, -0.5, 1.0, 5.0), mass_normal, collisions_toplayer);
    addFixture(crank, box(-4.5, -0.5, 5.0, 1.0), mass_normal, collisions_toplayer);
    var revoluteJoint = world.createJoint(pl.RevoluteJoint({}, ground, crank, Vec2(x,y)));
    crank.setAngle(initial_rotation);
    crank.attach1 = Vec2(x,y).add(Rot.mul(Rot(initial_rotation),Vec2(-4.5, 0)));
    crank.attach2 = Vec2(x,y).add(Rot.mul(Rot(initial_rotation),Vec2(0, 4.5)));
    crank.attach_points = [];
    crank.attach_points[0] = crank.attach1;
    crank.attach_points[1] = crank.attach2;
    return crank;
}

function create_transparent_lever(world, ground, x, y) {
    // Creates a crank with collision-less horizontal part, used in the injector and regens
    let injector_lever = world.createBody({
	type: "dynamic",
	position: new Vec2(x, y)
    });

    var fix1 = box(-0.5, -0.5, 4.0, 1.0);
    var fix2 = box(-0.5, -3.5, 1.0, 4.0);
    addUnionFixture(injector_lever, fix1, mass_none, collisions_none);
    addUnionFixture(injector_lever, fix2, mass_normal, collisions_toplayer);

    completeUnion(injector_lever);
    var revoluteJoint = world.createJoint(pl.RevoluteJoint({
	lowerAngle: -0.25 * Math.PI,
	upperAngle: 0.25 * Math.PI,
	enableLimit: false,
    }, ground, injector_lever, Vec2(x, y)));
    injector_lever.attach_points = [];
    injector_lever.attach_points[0] = Vec2(x+3, y);
    return injector_lever;
}

var channel_pitch = 8.0;
var narrow_pitch = 3; // For compressed channels
var row_separation = 4.0;
function create_injectors(world, ground, part_index) {
    // Create the hopper and injector
    // Injector consists of an active rectangle and an intangible rectangle
    var injector_levers = [];

    for(var i=0;i<8;i++) {

	var injector_lever = create_transparent_lever(world, ground, i*channel_pitch, 4.5);

	injector_levers.push(injector_lever);
	part_index['injector'+i] = injector_lever;

	// Add channel right side
	var channel_side = world.createBody({type: "static", position: new Vec2(i*channel_pitch+3.0,3.1)});
	var side_poly = Polygon([Vec2(-0.5,-0.5), Vec2(0.8,-0.4), Vec2(0.8, 2.1), Vec2(-0.2, 2.1)]);
	addFixture(channel_side, side_poly, mass_none, collisions_toplayer);
	addFixture(channel_side, box(1.0, 1.0, 3.0, 1.0), mass_none, collisions_toplayer);

	// Add channel base
	var channel_side = world.createBody({type: "static", position: new Vec2(i*channel_pitch+2.0,-0.5)});
	var base_poly = Polygon([Vec2(-1,0), Vec2(2,0), Vec2(2,1.1), Vec2(-1,1)]);
	addFixture(channel_side, base_poly, mass_none, collisions_toplayer);

	// Add channel left side (backstop)
	var channel_side = world.createBody({type: "static", position: new Vec2(i*channel_pitch-1.25,0)});
	addFixture(channel_side, box(-0.5, 0, 1.0, 2.0), mass_none, collisions_toplayer);
    }

    // Add hopper
    var hopper_left = world.createBody({type: "static", position: new Vec2(-3.0,5.5)});
    addFixture(hopper_left, new Polygon([Vec2(0,0), Vec2(3,0), Vec2(-10,10), Vec2(-13,10)]), mass_none, collisions_toplayer);

    // Add hopper
    var hopper_right = world.createBody({type: "static", position: new Vec2(0.0+8*channel_pitch,5.5)});
    addFixture(hopper_right, new Polygon([Vec2(0,0), Vec2(3,0), Vec2(16,10), Vec2(13,10)]), mass_none, collisions_toplayer);

    for(var i=0;i<16;i++) {
	let ball1 = world.createBody({
	    type: "dynamic",
	    position: new Vec2(2.0+4*i, 8.0)
	});
	addFixture(ball1, new Circle(1.0), mass_normal, collisions_toplayer);
    }
    part_index['injector_levers'] = injector_levers;

    // Add injector controls and bar
    for(var i=0;i<8;i++) {
	let injector_control = world.createBody({type: "dynamic", position: new Vec2(i*channel_pitch+2.5, 20)});
	addFixture(injector_control, box(0,0,1,2), mass_normal, collisions_toplayer);
	var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	    lowerTranslation : 0.0,
	    upperTranslation : 2.0,
	    enableLimit : true
	}, ground, injector_control, Vec2(0.0, 0.0), Vec2(0.0,1.0)));
	var distanceJoint = world.createJoint(pl.DistanceJoint({}, injector_levers[i], new Vec2(i*channel_pitch+3.0, 4.5), injector_control, new Vec2(i*channel_pitch+3.0,20.5)));
    }
    // Add all-inject bar
    let all_inject = world.createBody({type: "dynamic", position: new Vec2(0, 19)});
    addFixture(all_inject, box(0,0,8*channel_pitch,1), mass_normal, collisions_toplayer);
    var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	lowerTranslation : 0.0,
	upperTranslation : 2.0,
	enableLimit : true
    }, ground, all_inject, Vec2(0.0, 0.0), Vec2(0.0,1.0)));
    all_inject.attach_points = [];
    all_inject.attach_points[0] = Vec2(4*channel_pitch, 19.5);
    part_index['all_inject'] = all_inject;
}

function create_fake_data(world, ground, x, y, n) {
    for(var i=0;i<n;i++) {
	let ball1 = world.createBody({
	    type: "dynamic",
	    position: new Vec2(x+channel_pitch*i, y)
	});
	addFixture(ball1, new Circle(1.0), mass_normal, collisions_toplayer);
    }

}

function create_memory(world, ground, part_index) {
    var memory_lines = [];
    for(var row=0; row<8; row++) {
	var eject_line = world.createBody({type: "dynamic", position: new Vec2(-3.0, -30.0 + row_separation*row)});
	var block_line = world.createBody({type: "dynamic", position: new Vec2(-3.0, -30.0 + row_separation*row - 1.5)});
	var line_shapes = [];
	for(var col=0; col<8; col++) {
	    line_shapes.push(box(col*channel_pitch+2.0, 0, 5.0, 1.0));
	    addFixture(eject_line, box(col*channel_pitch+2.0, 0, 5.0, 1.0), mass_normal, collisions_toplayer);
	}

	var blocker = new Polygon(translate_points([Vec2(0,0), Vec2(2,0), Vec2(1,2.5), Vec2(0,2.5)], col*7+7.0, 0));
	for(var col=0;col<4;col++) {
	    line_shapes.push(box(8*channel_pitch+10+10*col+1.1, -0.1, 1.0, 1.0));
	}

	// Turn everything in 'line_shapes' into real fixtures and combine the
	// shapes into one polygon
	var compound_shape = new Polygon();
	var compound_shapes = [];
	block_line.shapeOverride = [];
	for(var i=0;i<line_shapes.length;i++) {
	    addFixture(block_line, line_shapes[i], mass_normal, collisions_toplayer);
	    if(i!=7) {
		block_line.shapeOverride.push(line_shapes[i]);
	    }
	}
	addFixture(block_line, blocker, mass_normal, collisions_toplayer);

	compound_shape.m_vertices = union([line_shapes[7], blocker]);
	// Add another ghost fixture to hold the line together
	var joining_bar = box(0,0,8*channel_pitch+10+10*2+2, 1);
	addFixture(block_line, joining_bar, mass_none, collisions_none);
	joining_bar.colour = "#c0c0c0";
	block_line.shapeOverride.push(compound_shape);
	block_line.shapeOverride.push(joining_bar);

	var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	    lowerTranslation : -channel_pitch,
	    upperTranslation : 0.0,
	    enableLimit : true,
	    motorSpeed : 0.0,
	    maxMotorForce: 1.0,
	    enableMotor: true
	}, ground, eject_line, Vec2(0.0, 1.0), Vec2(1.0,0.0)));
	var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	    lowerTranslation : -channel_pitch,
	    upperTranslation : 0.0,
	    enableLimit : true
	}, ground, block_line, Vec2(0.0, 1.0), Vec2(1.0,0.0)));
	memory_lines.push(eject_line);

	// Create the crank which biases the block line
	if(row<8) {
	    var crank_x = -10 - 5.0*row;
	    var crank_y = -35.5 + row_separation*row;
	    var bias_crank = create_crank(world, ground, crank_x, crank_y, 0);
	    var distanceJoint = world.createJoint(pl.DistanceJoint({}, bias_crank, new Vec2(crank_x, crank_y+4.5), block_line, new Vec2(-3.0,crank_y+4.5)));
	}
    }
    // Memory line holdoff bar
    var memory_right_x = 8*channel_pitch+10*4;
    var memory_holdoff = world.createBody({type: "dynamic", position: new Vec2(memory_right_x-3.9, -32.0)});
    addFixture(memory_holdoff, box(0, 0, 2.0, 8*row_separation), mass_none, collisions_toplayer);
    var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	lowerTranslation : 0.0,
	upperTranslation : row_separation,
	enableLimit : false
    }, ground, memory_holdoff, Vec2(0.0, 0.0), Vec2(1.0,0)));

    // Memory line limiting block(s)
    var memory_limit = world.createBody({type: "static", position: new Vec2(memory_right_x-8, -32.0)});
    addFixture(memory_limit, box(0, 0, 1.0,1.0), mass_none, collisions_toplayer);
    // Memory holdoff crank
    var holdoff_crank = create_crank(world, ground, memory_right_x+10, -16, Math.PI);
    var distanceJoint = world.createJoint(pl.DistanceJoint({}, holdoff_crank, holdoff_crank.attach_points[1], memory_holdoff, new Vec2(memory_right_x-3.5,-16.0)));
    part_index['memory_block_lines'] = memory_lines;
    part_index['memory_holdoff_crank'] = holdoff_crank;
}

function create_memory_decoder(world, ground, xoffset, yoffset, part_index) {
    /* This is the decoder pattern and holdoff bar */
    var decoder_lines = [];
    var sensor_drop = -100;
    var cols = 3;
    for(var col=0; col<cols; col++) {
	var decoder_line = world.createBody({type: "dynamic", position: new Vec2(-3.0+xoffset+col*10.0, yoffset)});
	// Add an intangible box to hold the columns together
	addFixture(decoder_line, box(0, sensor_drop, 1.0, row_separation*8+1-sensor_drop), mass_none, collisions_none);
	for(var row=0; row<8; row++) {
	    var offset = ((row>>(cols-1-col))%2==1)?0:1;
	    addFixture(decoder_line, box(0, row_separation*row-offset-1.0, 1.0, 1.0), mass_normal, collisions_toplayer);
	}

	// Add the decoder holdoff bar pin
	addFixture(decoder_line, box(0, row_separation*8,1.0,1.0), mass_normal, collisions_toplayer);
	var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	    lowerTranslation : 0.0,
	    upperTranslation : row_separation,
	    enableLimit : true
	}, ground, decoder_line, Vec2(0.0, 0.0), Vec2(0.0,1.0)));

	// Add the 'sensor'
	addFixture(decoder_line, box(0, sensor_drop, 1.0, 1.0), mass_normal, collisions_toplayer);

	decoder_lines.push(decoder_line);
    }

    // Add the holdoff bar
    var decoder_holdoff_bar = world.createBody({type: "dynamic", position: new Vec2(-3.0+xoffset, yoffset+row_separation*8-1)});
    addFixture(decoder_holdoff_bar, box(0,0,21,1), mass_normal, collisions_toplayer);
    var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	lowerTranslation : 0.0,
	upperTranslation : row_separation,
	enableLimit : true
    }, ground, decoder_holdoff_bar, Vec2(0.0, 0.0), Vec2(0.0,1.0)));
    decoder_holdoff_bar.attach_points = [];
    decoder_holdoff_bar.attach_points[0] = Vec2(xoffset-3.0+10.5, yoffset+row_separation*8-0.5);
    part_index['decoder_holdoff_bar'] = decoder_holdoff_bar;
}

function create_discarder(world, ground, origin_x, origin_y, part_index) {
    var block_width = channel_pitch - 2.2;
    var vertical_pitch = 1;
    var initial_rotation = 0.3;
    var discard_flaps = [];
    for(var i=0;i<8;i++) {
	var discard_flap = world.createBody({type: "dynamic", position: new Vec2(origin_x+i*channel_pitch, origin_y+i*vertical_pitch+2)});
	addFixture(discard_flap, new Polygon([Vec2(0,0), Vec2(channel_pitch,0), Vec2(channel_pitch+1,1), Vec2(1,1)]), mass_normal, collisions_toplayer);
	addFixture(discard_flap, new Polygon([Vec2(0,-4), Vec2(1,-4), Vec2(1,0), Vec2(0,0)]), mass_normal, collisions_toplayer);
	discard_flap.setAngle(initial_rotation);
	var revoluteJoint = world.createJoint(pl.RevoluteJoint({
	}, ground, discard_flap, Vec2(origin_x+i*channel_pitch+0.1, origin_y+i*1+2.1)));
	if(i>0) {
	    var local_pos = Rot.mul(Rot(initial_rotation),Vec2(0.5, -3.5));
	    discard_flap.attach_points = [];
	    discard_flap.attach_points[0] = Vec2(origin_x+i*channel_pitch,origin_y+i*vertical_pitch+2).add(local_pos);
	    var distanceJoint = world.createJoint(pl.DistanceJoint({
	    }, discard_flaps[i-1], Vec2(origin_x+(i-1)*channel_pitch,origin_y+(i-1)*vertical_pitch+2).add(local_pos), discard_flap, discard_flap.attach_points[0]));
	}
	discard_flaps.push(discard_flap);
    }
    // One final rest
    var discarder_block = world.createBody({type: "static", position: new Vec2(origin_x+8*channel_pitch-1, origin_y+9)});
    addFixture(discarder_block, box(0,0,1,1), mass_none, collisions_toplayer);
    part_index['discarder'] = discard_flap;
}

function horizontal_prismatic(world, ground, object) {
    var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	enableLimit : false
    }, ground, object, Vec2(0.0, 0.0), Vec2(1.0,0.0)));
    return prismaticJoint;
}

function create_regen(world, ground, origin_x, origin_y, part_index, base_name) {

    for(var col=0;col<8;col++) {
	var lever = create_transparent_lever(world, ground, origin_x+5+channel_pitch*col, origin_y+3);
	part_index[base_name + 'lever' + col] = lever;
    }
    // Create pusher line
    var regen_bar = world.createBody({type: "dynamic", position: new Vec2(origin_x, origin_y)});
    var blocking_bar = world.createBody({type: "static", position: new Vec2(origin_x, origin_y)});
    for(var col=0; col<8; col++) {
	addFixture(regen_bar, box(col*channel_pitch+0.5, 0, 1, 3), mass_normal, collisions_toplayer)
	addFixture(blocking_bar, box(col*channel_pitch, -1, channel_pitch-3.5, 0.8), mass_normal, collisions_toplayer)
    }

    var joining_bar = box(0,0,8*channel_pitch, 2);
    addFixture(regen_bar, joining_bar, mass_none, collisions_none);
    horizontal_prismatic(world, ground, regen_bar);
    regen_bar.attach_points = [];
    regen_bar.attach_points[0] = new Vec2(origin_x+(col-1)*channel_pitch+0.5, origin_y+1);
    part_index[base_name] = regen_bar;
}

function reducer_y_func(pos) {
    // Slightly quadratic forumla allowing more space at the outside edges of the reducer
    var x = Math.abs(pos);
    var y = x*x*0.2+x*0.7;
    return y;
}

function create_pitch_reducer(world, ground, offsetx, offsety) {
    var reducer = world.createBody({type: "static", position: new Vec2(offsetx, offsety)});
    var centre_x = offsetx+channel_pitch*4;
    for(var col=0;col<9;col++) {
	var pos = col-4;
	addFixture(reducer, new Polygon([Vec2(centre_x+narrow_pitch*pos, offsety-1-reducer_y_func(pos)),
					 Vec2(centre_x+narrow_pitch*pos+0.5, offsety-1-reducer_y_func(pos)),
				     Vec2(centre_x+channel_pitch*pos+0.5, offsety),
				     Vec2(centre_x+channel_pitch*pos, offsety)]), mass_normal, collisions_toplayer)
	addFixture(reducer, new Polygon([Vec2(centre_x+narrow_pitch*pos, offsety-10),
				     Vec2(centre_x+narrow_pitch*pos+0.5, offsety-10),
					 Vec2(centre_x+narrow_pitch*pos+0.5, offsety-1-reducer_y_func(pos)),
					 Vec2(centre_x+narrow_pitch*pos, offsety-1-reducer_y_func(pos))]), mass_normal, collisions_toplayer)
    }
}

function create_narrow_channel(world, ground, offsetx, offsety) {
    var reducer = world.createBody({type: "static", position: new Vec2(offsetx, offsety)});
    var centre_x = offsetx+channel_pitch*4;
    for(var col=0;col<9;col++) {
	var pos = col-4;
	addFixture(reducer, new Polygon([Vec2(centre_x+narrow_pitch*pos, offsety-10),
				     Vec2(centre_x+narrow_pitch*pos+0.5, offsety-10),
					 Vec2(centre_x+narrow_pitch*pos+0.5, offsety-1),
					 Vec2(centre_x+narrow_pitch*pos, offsety-1)]), mass_normal, collisions_toplayer)
    }
}

function connect(world, body1, body2, attachpoint1, attachpoint2) {
    if(attachpoint1 === undefined) {
	attachpoint1 = 0;
    }
    if(attachpoint2 === undefined) {
	attachpoint2 = 0;
    }
    attachpoint1 = 0;
    attachpoint2 = 0;
    // Make a distance joint between two Body objects, both of which should have 'attach_points' defined.
    var distanceJoint = world.createJoint(pl.DistanceJoint({
    }, body1, body1.attach_points[attachpoint1], body2, body2.attach_points[attachpoint2]));
    return distanceJoint;
}

function createWorld(world) {

    var part_index = [];
    // Create the ground object, just in case we need it
    var ground = world.createBody();
    addFixture(ground, box(-5.0, 0, 1, 1), mass_none, collisions_none);
    create_injectors(world, ground, part_index);
    create_memory(world, ground, part_index);
    create_memory_decoder(world, ground, channel_pitch*8+10, -29.5, part_index);
    create_discarder(world, ground, 0, -50, part_index);

    create_regen(world, ground, 0, -60, part_index, 'regen1');
    create_fake_data(world, ground, 2, -60+5, 8);
    create_fake_data(world, ground, -0.1+channel_pitch*6, -80, 1);
    create_fake_data(world, ground, -0.1+channel_pitch*3, -35, 1);
    create_fake_data(world, ground, -0.1+channel_pitch*7, -35, 1);
    create_subtractor_block(world, ground, -70, -200, part_index, 'accumulator_read', true);
    create_subtractor_block(world, ground, -140, -200, part_index, 'accumulator_write', false);
    create_subtractor_block(world, ground, 70, -200, part_index, 'pc_read', true);
    create_subtractor_block(world, ground, 140, -200, part_index, 'pc_write', false);
    create_pitch_reducer(world, ground, 0, -32);
    create_router_block(world, ground, -4, -77, part_index, false);
    create_router_block(world, ground, -4+narrow_pitch*17, -77, part_index, true);

    create_narrow_channel(world, ground, 0, -53);
    create_router_block(world, ground, -4, -120, part_index, false);
    create_router_block(world, ground, -4+narrow_pitch*17, -120, part_index, true);

    create_instruction_decoder(world, ground, 0, -300, part_index);

    create_fake_data(world, ground, -11, -250, 1);

    var decoder_holdoff_cam_follower = create_cam_and_h_follower(world, ground, 80, 40, decoder_timing);
    var memory_holdoff_cam_follower = create_cam_and_h_follower(world, ground, 115, 40, null_timing);
    var all_inject_cam_follower = create_cam_and_h_follower(world, ground, 22, 40, null_timing);
    var regen1_cam_follower = create_cam_and_v_follower(world, ground, 120, -45, regen_timing, {'bumpheight':1.5});
    var acc_reset_cam_follower = create_cam_and_v_follower(world, ground, -200, -155, acc_reset_timing, {'leverlen': 40, 'bumpheight': 1.5});
    var instruction_reader_cam_follower = create_cam_and_v_follower(world, ground, -50, -265, acc_reset_timing, {'leverlen': 40, 'bumpheight': 1.5});
    var instruction_reset_cam_follower = create_cam_and_v_follower(world, ground, 100, -280, acc_reset_timing, {'bumpheight': 1.5, 'left': true});
    var instruction_holdoff_cam_follower = create_cam_and_h_follower(world, ground, 10, -330, instruction_holdoff_timing, {'bumpheight': 1.5});

    connect(world, decoder_holdoff_cam_follower, part_index['decoder_holdoff_bar']);
    connect(world, memory_holdoff_cam_follower, part_index['memory_holdoff_crank']);
    connect(world, all_inject_cam_follower, part_index['all_inject']);
    connect(world, regen1_cam_follower, part_index['regen1']);
    connect(world, acc_reset_cam_follower, part_index['accumulator_read_reset']);
    for(var col=0;col<8;col++) {
	connect(world, part_index['regen1lever'+col], part_index['injector'+col]);
	connect(world, part_index['accumulator_write'+col], part_index['accumulator_read'+col]);
    }
    connect(world, instruction_reader_cam_follower, part_index['instruction_reader']);
    connect(world, instruction_reset_cam_follower, part_index['instruction_resetter']);
    connect(world, instruction_holdoff_cam_follower, part_index['instruction_holdoff']);

}
