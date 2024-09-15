'use strict';

var decoder_timing = [ [0.02, 0.02, 0.2, 0 ], [0.2, 0, 0.05, 0] ];
var discard_timing = [ [0.15, 0.01, 0.15, 0 ] ];
var pc_read_timing = [ [0.00, 0.02, 0.08, 0 ] ];
var all_inject_timing = [ [0.01, 0.015, 0.0, 0.0 ] ];
var regen_timing = [ [0.0, 0.01, 0.08, 0, 0.5 ], [1.13, 0.01, 0.2, 0, 0.5], [1.3, 0.01, 0.02, 0, 1.5] ];
var acc_reset_timing = [ [0.01, 0.01, 0, 0 ] ];
var pc_reset_timing = acc_reset_timing;
var instruction_holdoff_timing = [ [0.03, 0.01, 0.2, 0], [0.2, 0, 0.2, 0], [0.5, 0, 0.2, 0] ];
var mem_holdoff_timing = [ [0.0, 0.01, 0.2, 0], [0.2, 0, 0.1, 0], [0.35,0.01,0.1,0] ];
var mem_reset_timing = [ [0.0, 0.02, 0.2, 0], [0.3, 0.02, 0.2,0] ];
var null_timing = [ [0, 0.01, 0.1, 0 ]];
var instruction_read_timing = [ [0.15, 0.01, 0.1, 0] ];

var channel_pitch = 8.0;
var narrow_pitch = 3; // For compressed channels
var row_separation = 4.0;
var decoder_x_pitch = 8;

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
    var vertices_array = union(body.union_shapes);

    body.shapeOverride = new Array();
    for(var i=0;i<vertices_array.length;i++) {
	var union_shape = new Polygon();
	union_shape.m_vertices = vertices_array[i];
	body.shapeOverride.push(union_shape);
    }
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

function create_crank(world, ground, x, y, initial_rotation, output_length) {
    if(output_length === undefined) {
	output_length = 4.5;
    }
    // Rotation in radians. Zero rotation is an 'L' shape going up and left from the origin.
    var crank = world.createBody({type: "dynamic", position: new Vec2(x, y)});
    addFixture(crank, box(-0.5, -0.5, 1.0, output_length+0.5), mass_normal, collisions_toplayer);
    addFixture(crank, box(-4.5, -0.5, 5.0, 1.0), mass_normal, collisions_toplayer);
    var revoluteJoint = world.createJoint(pl.RevoluteJoint({}, ground, crank, Vec2(x,y)));
    crank.setAngle(initial_rotation);
    crank.attach1 = Vec2(x,y).add(Rot.mul(Rot(initial_rotation),Vec2(-4.5, 0)));
    crank.attach2 = Vec2(x,y).add(Rot.mul(Rot(initial_rotation),Vec2(0, output_length)));
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
	var side_poly = Polygon([Vec2(-0.4,-0.5), Vec2(0.8,-0.4), Vec2(0.8, 2.1), Vec2(-0.2, 2.1)]);
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

    // Final channel right side (backstop)
    var channel_side = world.createBody({type: "static", position: new Vec2(8*channel_pitch-1.25,0)});
    addFixture(channel_side, box(-0.5, 0, 1.0, 2.0), mass_none, collisions_toplayer);

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
	world.active_ball_list.push(ball1);
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
	upperTranslation : 3.0,
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

function create_memory(world, ground, xoffset, yoffset, part_index) {
    var memory_lines = [];
    for(var row=0; row<8; row++) {
	var eject_line = world.createBody({type: "dynamic", position: new Vec2(-3.0, -30.0 + row_separation*row)});
	var block_line = world.createBody({type: "dynamic", position: new Vec2(-3.0, -30.0 + row_separation*row - 1.5)});
	var line_shapes = [];

	addFixture(eject_line, box(2.0+xoffset, yoffset, 5.0, 1.0), mass_normal, collisions_toplayer);
	for(var col=1; col<=8; col++) {
	    line_shapes.push(new Polygon(translate_points([Vec2(0,0), Vec2(5.1,0), Vec2(5.0,1.0), Vec2(0,1.2)], col*channel_pitch+2.0+xoffset, yoffset)));
	    addFixture(eject_line, box(col*channel_pitch+4.5+xoffset, yoffset, 2.5, 1.0), mass_normal, collisions_toplayer);
	}

	for(var col=0;col<4;col++) {
	    line_shapes.push(box(8*channel_pitch+10+decoder_x_pitch*col+1.1+xoffset, -0.1+yoffset, 1.0, 1.0));
	}

	// Turn everything in 'line_shapes' into real fixtures and combine the
	// shapes into one polygon
	var compound_shape = new Polygon();
	block_line.shapeOverride = [];
	for(var i=0;i<line_shapes.length;i++) {
	    addFixture(block_line, line_shapes[i], mass_normal, collisions_toplayer);
	    if(i!=7) {
		block_line.shapeOverride.push(line_shapes[i]);
	    }
	}

	// Blocker connects the block line to the eject line
	var blocker = new Polygon(translate_points([Vec2(0,0), Vec2(2,0), Vec2(1,2.5), Vec2(0,2.5)], 9*channel_pitch-1+xoffset, yoffset));
	addFixture(block_line, blocker, mass_normal, collisions_toplayer);

	compound_shape.m_vertices = union([line_shapes[7], blocker]);
	// Add another ghost fixture to hold the line together
	var joining_bar = box(0,0,8*channel_pitch+10+10*2+2+xoffset, 1+yoffset);
	addFixture(block_line, joining_bar, mass_none, collisions_none);
	joining_bar.colour = "#c0c0c0";

	// Should just use compound_shape here but it doesn't work for some reason
	//block_line.shapeOverride.push(compound_shape);
	block_line.shapeOverride.push(line_shapes[7]);
	block_line.shapeOverride.push(blocker);
	block_line.shapeOverride.push(joining_bar);

	var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	    lowerTranslation : -channel_pitch,
	    upperTranslation : 0.0,
	    enableLimit : true,
	    motorSpeed : 0.0,
	    maxMotorForce: 10.0,
	    enableMotor: true
	}, ground, eject_line, Vec2(0.0, 1.0), Vec2(1.0,0.0)));
	var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	    lowerTranslation : -channel_pitch,
	    upperTranslation : 0.0,
	    motorSpeed : 0.0,
	    maxMotorForce: 10.0,
	    enableMotor: true,
	    enableLimit : true
	}, ground, block_line, Vec2(0.0, 1.0), Vec2(1.0,0.0)));
	memory_lines.push(eject_line);

	// Create the crank which biases the block line
	if(row<8) {
	    var crank_x = -10 - 5.0*row+xoffset;
	    var crank_y = -35.5 + row_separation*row+yoffset;
	    var bias_crank = create_crank(world, ground, crank_x, crank_y, 0);
	    var distanceJoint = world.createJoint(pl.DistanceJoint({}, bias_crank, new Vec2(crank_x, crank_y+4.5), block_line, new Vec2(-3.0,crank_y+4.5)));
	}
    }
    // Memory line holdoff bar
    var memory_left_x = xoffset;
    var memory_right_x = 8*channel_pitch+4*decoder_x_pitch+memory_left_x;
    var memory_holdoff = world.createBody({type: "dynamic", position: new Vec2(memory_right_x-3.9, -32.0+yoffset)});
    addFixture(memory_holdoff, box(0, 0, 1.0, 8*row_separation), mass_none, collisions_toplayer);
    var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	lowerTranslation : 0.0,
	upperTranslation : row_separation,
	enableLimit : false
    }, ground, memory_holdoff, Vec2(0.0, 0.0), Vec2(1.0,0)));

    // Memory line limiting block(s)
    var memory_limit = world.createBody({type: "static", position: new Vec2(memory_right_x-6, -32.0+yoffset)});
    addFixture(memory_limit, box(0, 0, 1.0,2.0), mass_none, collisions_toplayer);
    // Memory holdoff crank
    var holdoff_crank = create_crank(world, ground, memory_right_x+10, -7+yoffset, Math.PI, 10);
    var distanceJoint = world.createJoint(pl.DistanceJoint({}, holdoff_crank, holdoff_crank.attach_points[1], memory_holdoff, new Vec2(memory_right_x-3.5,-16.0+yoffset)));
    part_index['memory_block_lines'] = memory_lines;
    part_index['memory_holdoff_crank'] = holdoff_crank;

    // Memory reset bar
    var memory_reset = world.createBody({type: "dynamic", position: new Vec2(memory_left_x-5, -32.0+yoffset)});
    addFixture(memory_reset, box(0, -1.0, 1.0, 8*row_separation), mass_none, collisions_toplayer);
    var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	lowerTranslation : 0.0,
	upperTranslation : row_separation,
	enableLimit : false
    }, ground, memory_reset, Vec2(0.0, 0.0), Vec2(1.0,0)));

    part_index['memory_reset_bar'] = memory_reset;
    memory_reset.attach_points = [];
    memory_reset.attach_points[0] = new Vec2(memory_left_x-5+0.5, -32.0+4*row_separation);

    // Limits for memory reset bar
    var memory_reset_limits = world.createBody({type: "static", position: new Vec2(memory_left_x-6, -32.0+yoffset)});
    addFixture(memory_reset_limits, box(0, 0, 1.0, 1.0), mass_none, collisions_toplayer);
    addFixture(memory_reset_limits, box(0, row_separation*8-1, 1.0, 1.0), mass_none, collisions_toplayer);

}

function create_memory_decoder(world, ground, xoffset, yoffset, part_index) {
    /* This is the decoder pattern and holdoff bar */
    var decoder_lines = [];
    var sensor_drop = -200;
    var cols = 3;
    for(var col=0; col<cols; col++) {
	var decoder_line = world.createBody({type: "dynamic", position: new Vec2(-3.0+xoffset+col*decoder_x_pitch, yoffset)});
	// Add an intangible box to hold the columns together
	addFixture(decoder_line, box(0, sensor_drop, 1.0, row_separation*8+1-sensor_drop), mass_none, collisions_none);
	for(var row=0; row<8; row++) {
	    var offset = ((row>>(cols-1-col))%2==1)?0:1;
	    addFixture(decoder_line, box(0, row_separation*row-offset-2.2, 1.0, 1.0), mass_normal, collisions_toplayer);
	}

	// Add the decoder holdoff bar pin
	addFixture(decoder_line, box(0, row_separation*8,1.0,1.0), mass_normal, collisions_toplayer);
	var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	    lowerTranslation : 0.0,
	    upperTranslation : row_separation,
	    enableLimit : true
	}, ground, decoder_line, Vec2(0.0, 0.0), Vec2(0.0,1.0)));

	// Add the 'sensor' way below the main decoder
	addFixture(decoder_line, box(0, sensor_drop, 1.0, 1.0), mass_normal, collisions_toplayer);

	decoder_lines.push(decoder_line);
    }

    // Add the holdoff bar
    var decoder_holdoff_bar = world.createBody({type: "dynamic", position: new Vec2(-3+xoffset, yoffset+row_separation*8-1)});
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
    var initial_rotation = 0.15;
    var discard_static = world.createBody({type: "static", position: new Vec2(origin_x, origin_y)});
    var discard_sliding = world.createBody({type: "dynamic", position: new Vec2(origin_x, origin_y)});

    for(var i=0;i<9;i++) {
	var static_poly = new Polygon(translate_points([Vec2(0,0), Vec2(channel_pitch/2,0), Vec2(channel_pitch/2,1), Vec2(0,1)], i*channel_pitch, 0));
	addFixture(discard_static, static_poly, mass_normal, collisions_toplayer);
	var sliding_poly = new Polygon(translate_points([Vec2(0,0), Vec2(channel_pitch/2,0), Vec2(channel_pitch/2,0), Vec2(0,0.5)], i*channel_pitch, 1));
	addFixture(discard_sliding, sliding_poly, mass_normal, collisions_toplayer);
    }

    discard_static.setAngle(initial_rotation);
    discard_sliding.setAngle(initial_rotation);
    discard_sliding.attach_points = []
    discard_sliding.attach_points[0] = Vec2(origin_x, origin_y+2);
    part_index['discarder'] = discard_sliding;
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

    // Blocking bar is the base
    var blocking_bar = world.createBody({type: "static", position: new Vec2(origin_x, origin_y)});
    var blockbar_width = channel_pitch;
    for(var col=0; col<8; col++) {
	var x = col*channel_pitch;
	addFixture(regen_bar, box(x+0.5, 0, 1, 2), mass_normal, collisions_toplayer)
	addFixture(blocking_bar, new Polygon([Vec2(x+3,-2), Vec2(x+blockbar_width, -2), Vec2(x+blockbar_width, -0.8), Vec2(x+3, -1)]), mass_normal, collisions_toplayer)
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

function create_narrow_channel(world, ground, offsetx, offsety, drop) {
    var reducer = world.createBody({type: "static", position: new Vec2(offsetx, offsety)});
    var centre_x = offsetx+channel_pitch*4;
    for(var col=0;col<9;col++) {
	var pos = col-4;
	addFixture(reducer, new Polygon([Vec2(centre_x+narrow_pitch*pos, offsety+drop),
				     Vec2(centre_x+narrow_pitch*pos+0.5, offsety+drop),
					 Vec2(centre_x+narrow_pitch*pos+0.5, offsety-1),
					 Vec2(centre_x+narrow_pitch*pos, offsety-1)]), mass_normal, collisions_toplayer)
    }
}

function create_narrow_channels(world, ground, offsetx, offsety, drop, num_channels) {
    var reducer = world.createBody({type: "static", position: new Vec2(offsetx, offsety)});
    var centre_x = offsetx+channel_pitch*4;
    for(var col=0;col<num_channels;col++) {
	var pos = col-4;
	addFixture(reducer, new Polygon([Vec2(centre_x+narrow_pitch*pos, offsety+drop),
				     Vec2(centre_x+narrow_pitch*pos+0.5, offsety+drop),
					 Vec2(centre_x+narrow_pitch*pos+0.5, offsety-1),
					 Vec2(centre_x+narrow_pitch*pos, offsety-1)]), mass_normal, collisions_toplayer)
    }
}

function create_diagonal_channels(world, ground, offsetx, offsety, delta_x, delta_y, top_delta_x, top_delta_y, channel_count, mitre_delta_x, mitre_delta_y) {
    var channels = world.createBody({type: "static", position: new Vec2(offsetx, offsety)});
    for(var col=0;col < (channel_count+1);col++) {
	addFixture(channels, new Polygon([Vec2(top_delta_x*col, top_delta_y*col),
					  Vec2(top_delta_x*col+1, top_delta_y*col),
					  Vec2(top_delta_x*col+delta_x+1+ mitre_delta_x*(channel_count+1-col), delta_y + mitre_delta_y*(channel_count+1-col)),
					  Vec2(top_delta_x*col+delta_x+ mitre_delta_x*(channel_count+1-col), delta_y + mitre_delta_y*(channel_count+1-col))]
					), mass_normal, collisions_toplayer);
	console.log("Creating diagonal channel");
    }
}

function connect(world, body1, body2, attachpoint1, attachpoint2) {
    if(attachpoint1 === undefined) {
	attachpoint1 = 0;
    }
    if(attachpoint2 === undefined) {
	attachpoint2 = 0;
    }
    // Make a distance joint between two Body objects, both of which should have 'attach_points' defined.
    var distanceJoint = world.createJoint(pl.DistanceJoint({
    }, body1, body1.attach_points[attachpoint1], body2, body2.attach_points[attachpoint2]));
    return distanceJoint;
}

function create_mixer(world, ground, offsetx, offsety) {
    var mixer = world.createBody({type: "static", position: new Vec2(offsetx, offsety)});
    var pitch_x = channel_pitch/2;
    var pitch_y = channel_pitch/2;
    for(var i=0;i<4;i++) {
	for(var j=0;j<4;j++) {
	    var tx = i*pitch_x-j*pitch_y;
	    var ty = -i*pitch_x-j*pitch_y;
	    if(ty>-4*4) {
		addFixture(mixer, new Polygon([Vec2(tx, ty-2),
					       Vec2(tx+2,ty+0),
					       Vec2(tx,ty+1.5),
					       Vec2(tx-2,ty)]),
			   mass_normal, collisions_toplayer);
	    }
	}
	var tx = (i-2)*channel_pitch+channel_pitch/2;
	var ty = -14;
	addFixture(mixer, new Polygon([Vec2(tx-0.5, ty),
				       Vec2(tx+0.5, ty),
				       Vec2(tx+2.5, ty-10),
				       Vec2(tx-2.5, ty-10)]),
		   mass_normal, collisions_toplayer);
    }
}

function make_l_diverter(world, ground, offsetx, offsety, x_pitch, y_pitch, num_channels, delta_x, delta_y) {
    var diverter = world.createBody({type: "static", position: new Vec2(offsetx, offsety)});
    for(var i=0;i<num_channels+1;i++) {
	var j = num_channels +1 - i;
	addUnionFixture(diverter, box(i*x_pitch, i*y_pitch, 0.5, delta_y-i*y_pitch), mass_normal, collisions_toplayer);
	addUnionFixture(diverter, new Polygon([Vec2(i*x_pitch+0.5,i*y_pitch+0.5),
					  Vec2(i*x_pitch+0.5+x_pitch, i*y_pitch-y_pitch),
					  Vec2(i*x_pitch+x_pitch, i*y_pitch-0.5-y_pitch),
					  Vec2(i*x_pitch,i*y_pitch)]), mass_normal, collisions_toplayer);
	addUnionFixture(diverter, box((i+1)*x_pitch, (i-1)*y_pitch-0.5, delta_x-i*x_pitch, 0.5), mass_normal, collisions_toplayer);
    }
    completeUnion(diverter);
    return diverter;
}

function createWorld(world) {

    var part_index = [];
    // Create the ground object, just in case we need it
    var ground = world.createBody();

    // Add drain zones (places where ball bearings vanish)
    world.drain_holes = [];
    world.active_ball_list = [];
    addFixture(ground, box(-5.0, 0, 1, 1), mass_none, collisions_none);
    create_injectors(world, ground, part_index);
    create_memory(world, ground, 5.5, 0, part_index);
    create_memory_decoder(world, ground, channel_pitch*8+15.5, -29.5, part_index);
    create_discarder(world, ground, 5.5, -45, part_index);

    create_regen(world, ground, 8, -50, part_index, 'regen1');
    create_subtractor_block(world, ground, -70, -200, part_index, 'accumulator_read', true);
    create_subtractor_block(world, ground, -140, -200, part_index, 'accumulator_write', false);
    create_subtractor_block(world, ground, 69, -184, part_index, 'pc_read', true);
    create_subtractor_block(world, ground, 140, -184, part_index, 'pc_write', false);
    create_pitch_reducer(world, ground, 3, -27);
    create_router_block(world, ground, 0, -68, part_index, false, false, "acc_write_diverter");
    create_router_block(world, ground, 0+narrow_pitch*17, -68, part_index, true, false, "pc_write_diverter");

    create_narrow_channel(world, ground, 3, -48, -10);
    create_router_block(world, ground, 0, -110, part_index, false, true, "acc_read_diverter");
    create_router_block(world, ground, 0+narrow_pitch*17, -110, part_index, true, true, "pc_read_diverter");

    create_narrow_channel(world, ground, 3, -70, -50);

    var address_sender = create_address_sender(world, ground, 69, -232, part_index);

    var pc_read_cam_follower = create_cam_and_v_follower(world, ground, 250, -110, pc_read_timing, {'bumpheight':1.6, 'label': "PC Read", 'left': true, 'bias': 10.0});
    var pc_write_cam_follower = create_cam_and_v_follower(world, ground, 250, -70, pc_read_timing, {'bumpheight':1.6, 'label': "PC Update", 'left': true, 'bias': 10.0});

    //connect(world, pc_read_cam_follower, part_index['pc_read_diverter_lever'], 0, 1);
    world.createJoint(pl.PulleyJoint({}, pc_read_cam_follower, part_index['pc_read_diverter'],
				     Vec2(130,part_index['pc_read_diverter'].attach_points[0].y+3),
				     Vec2(130,part_index['pc_read_diverter'].attach_points[0].y),
				     pc_read_cam_follower.attach_points[0], part_index['pc_read_diverter'].attach_points[0], 0.1));

    /*world.createJoint(pl.PulleyJoint({}, pc_write_cam_follower, part_index['pc_write_diverter'],
				     Vec2(210,part_index['pc_write_diverter'].attach_points[0].y+3),
				     Vec2(210,part_index['pc_write_diverter'].attach_points[0].y),
				     pc_write_cam_follower.attach_points[0], part_index['pc_write_diverter'].attach_points[0], 0.1));*/

    create_instruction_decoder(world, ground, 51, -270, part_index);

    // Shield for top of decoder
    var decoder_shield = world.createBody({type: "static", position: new Vec2(38,-240)});
    addFixture(decoder_shield, new Polygon([Vec2(0,0), Vec2(67,-3), Vec2(67,-4), Vec2(0,-1)]), mass_normal, collisions_toplayer);

    make_l_diverter(world, ground, 26, -259, 3, 8, 3, 10, 68);
    var discarder_cam = create_cam_and_v_follower(world, ground, -80, -40, discard_timing, {'label': "Discard", 'bumpheight': 1.5, 'leverlen': 30});
    var decoder_holdoff_cam_follower = create_cam_and_h_follower(world, ground, 80, 40, decoder_timing, {'label': "Decoder holdoff"});
    var memory_holdoff_cam_follower = create_cam_and_h_follower(world, ground, 115, 40, mem_holdoff_timing, {'label': "Memory holdoff"});
    var memory_reset_cam_follower = create_cam_and_v_follower(world, ground, -80, -5, mem_reset_timing, {'bumpheight': 1.5, 'label': "Memory reset", 'leverlen': 30});
    var all_inject_cam_follower = create_cam_and_h_follower(world, ground, 22, 40, all_inject_timing, {'label': "All inject", "bumpheight": 1.3, 'leverlen': 30});
    var regen1_cam_follower = create_cam_and_v_follower(world, ground, 120, -45, regen_timing, {'bumpheight':1.5, 'label': "Regenerator 1"});
    var acc_reset_cam_follower = create_cam_and_v_follower(world, ground, -200, -155, acc_reset_timing, {'leverlen': 40, 'bumpheight': 1.5, 'label': "Accumulator reset"});
    var pc_reset_cam_follower = create_cam_and_v_follower(world, ground, 220, -155, pc_reset_timing, {'leverlen': 40, 'bumpheight': 1.5, 'label': "PC reset"});
    var instruction_reader_cam_follower = create_cam_and_v_follower(world, ground, -50, -235, instruction_read_timing, {'leverlen': 40, 'bumpheight': 1.5, 'label': "Instruction read"});
    var instruction_reset_cam_follower = create_cam_and_v_follower(world, ground, 180, -250, acc_reset_timing, {'bumpheight': 1.5, 'left': true, 'label': "Instruction reset"});

    // Instruction cams
    var opcode_cams=[];
    for(var i=0;i<8;i++) {
	var drop = i%4;
	opcode_cams[i] = create_cam_and_h_follower(world, ground, 46+7*i+(i>3?15:0), -300-40*drop, instruction_holdoff_timing, {'bumpheight': 1.5, 'label': "Instruction holdoff", 'left': i>3});
    }

    var address_sender_cam = create_cam_and_v_follower(world, ground, 120, -230, null_timing, {'bumpheight': 1.5, 'label': "Address send release"});

    // Channels leading out of the PC reader
    create_diagonal_channels(world, ground, 108, -190, -46.5, -28, channel_pitch, 0, 3, 4, 3.95);
    create_mixer(world, ground, 77.5, -203);
    create_diagonal_channels(world, ground, 40.5, -198, 28, 0, narrow_pitch, 2, 3, -1, -3.95);

    // Stops PC writes getting into cams
    create_diagonal_channels(world, ground, 130, -188, 50, -10, narrow_pitch, 2, 0, -1, -3.95);

    connect(world, address_sender_cam, part_index['address-sender-release']);

    connect(world, discarder_cam, part_index['discarder']);
    connect(world, decoder_holdoff_cam_follower, part_index['decoder_holdoff_bar']);
    connect(world, memory_holdoff_cam_follower, part_index['memory_holdoff_crank']);
    connect(world, memory_reset_cam_follower, part_index['memory_reset_bar']);
    connect(world, all_inject_cam_follower, part_index['all_inject']);
    connect(world, regen1_cam_follower, part_index['regen1']);
    connect(world, acc_reset_cam_follower, part_index['accumulator_read_reset']);
    connect(world, pc_reset_cam_follower, part_index['pc_read_reset']);
    for(var col=0;col<8;col++) {
	connect(world, part_index['regen1lever'+col], part_index['injector'+col]);
	connect(world, part_index['accumulator_write'+col], part_index['accumulator_read'+col]);
	connect(world, part_index['pc_write'+col], part_index['pc_read'+col]);
    }
    connect(world, instruction_reader_cam_follower, part_index['instruction_reader']);
    connect(world, instruction_reset_cam_follower, part_index['instruction_resetter']);
    for(var i=0;i<8;i++) {
	connect(world, opcode_cams[i], part_index['opcode'+i+'_holdoff']);
    }

    world.part_index = part_index;

    // Fake data for the instruction decoder
    for(var i=0;i<3;i++) {
	create_fake_data(world, ground, 28+3*i, -190, 1);
    }
    create_fake_data(world, ground, 193, -120, 1);

    // Populate the memory
    for(var i=1;i<=8;i++) {
	create_fake_data(world, ground, channel_pitch*i+5.5, -1, 1);
    }
}
