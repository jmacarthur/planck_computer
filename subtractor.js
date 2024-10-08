function create_subtractor_block(world, ground, offsetx, offsety, part_index, base_name, reader) {
    var pitch_y = 5;
    var max_height = pitch_y * 8;
    var channels = world.createBody({type: "static", position: new Vec2(offsetx, offsety)});
    for(var col=0;col<8;col++) {
	var x = offsetx + col*channel_pitch;
	var y = offsety + col*pitch_y;
	var toggle = world.createBody({type: "dynamic", position: new Vec2(x,y)});
	if(reader) {
	    var toggle_poly = new Polygon([Vec2(-0.7,-1), Vec2(0.7, -1), Vec2(0.1,3.5), Vec2(-0.1,3.5)]);
	    addUnionFixture(toggle, toggle_poly, mass_normal, collisions_toplayer);
	} else {
	    var toggle_poly1 = new Polygon([Vec2(-1,-1), Vec2(1, -1), Vec2(0,4)]);
	    addUnionFixture(toggle, toggle_poly1, mass_normal, collisions_toplayer);
	    var toggle_poly2 = new Polygon([Vec2(-3.5,-1), Vec2(3.5, -1), Vec2(4.5, 0), Vec2(-4.5,0)]);
	    addUnionFixture(toggle, toggle_poly2, mass_normal, collisions_toplayer);
	}
	if(toggle.union_shapes.length > 1) {
	    completeUnion(toggle);
	}
	var revoluteJoint = world.createJoint(pl.RevoluteJoint({
	    enableLimit: false,
	    motorSpeed : 0.0,
	    maxMotorForce: 10.0,
	    enableMotor: true
	}, ground, toggle, Vec2(x,y)));
	toggle.attach_points = [];
	toggle.attach_points[0] = Vec2(x,y+3);
	part_index[base_name+col] = toggle;

	// Create the intake funnel
	var channel_width = 2.1;
	addUnionFixture(channels, box(col*channel_pitch-channel_pitch/2, col*pitch_y+4.5, (channel_pitch-channel_width)/2, max_height-pitch_y*col-0.5), mass_none, collisions_topstatic);
	addUnionFixture(channels, box(col*channel_pitch-channel_pitch/2, col*pitch_y+3, (channel_pitch-channel_width-1)/2, max_height-pitch_y*col), mass_none, collisions_topstatic);
	var xstart = col*channel_pitch+channel_width/2;
	if(reader) {
	    addUnionFixture(channels, box(xstart, col*pitch_y+4, (channel_pitch-channel_width)/2, max_height-pitch_y*col), mass_none, collisions_topstatic);
	    addUnionFixture(channels, box(xstart+1, col*pitch_y+3, (channel_pitch-channel_width)/2-1, max_height-pitch_y*col), mass_none, collisions_topstatic);
	} else {
	    addUnionFixture(channels, box(col*channel_pitch+channel_width/2, col*pitch_y+7, (channel_pitch-channel_width)/2, max_height-pitch_y*col-3), mass_none, collisions_topstatic);
	}
	addUnionFixture(channels, new Polygon([Vec2(xstart,max_height+4), Vec2(xstart+channel_pitch/2-channel_width/4,max_height+5), Vec2(xstart+channel_pitch-channel_width,max_height+4)]),
			mass_none, collisions_topstatic);
	if(!reader) {
	    var adderPoly1 = new Polygon(translate_points([Vec2(-6,-2), Vec2(-6+2.7,-2), Vec2(-6+1,-1.2), Vec2(-6,-1.2)], col*channel_pitch, col*pitch_y));
	    addUnionFixture(channels, adderPoly1, mass_none, collisions_topstatic);
	}
	if(reader) {
	    addUnionFixture(channels, box(col*channel_pitch-1, -5, 2, col*pitch_y+3), mass_none, collisions_topstatic);
	    addUnionFixture(channels, box(col*channel_pitch-channel_pitch/2-0.5, -5, 1, col*pitch_y+7), mass_none, collisions_topstatic);
	    addUnionFixture(channels, box(col*channel_pitch-channel_pitch/2, -5, 4, 1), mass_none, collisions_topstatic);
	}
	if(reader) {
	    // Add drain holes.
	    world.drain_holes.push([offsetx+col*channel_pitch-4, offsety-4.5, 4, 5.5]);
	}
    }

    // Add final channel on right hand side
    if(reader) {
	addUnionFixture(channels, box(8*channel_pitch-channel_pitch/2-0.5, -5, 0.5, 8*pitch_y+5), mass_none, collisions_topstatic);
    }

    completeUnion(channels);

    var labelbody = world.createBody({type: "static", position: new Vec2(offsetx, offsety)});
    labelbody.label = base_name;
    labelbody.labelx = 4*channel_pitch;
    labelbody.labely = -10;

    // Reset lever
    if(reader) {
	var reset_bar = world.createBody({type: "dynamic", position: new Vec2(offsetx-4, offsety+2)});
	var reset_shape = new Polygon([Vec2(0,0), Vec2(1,0), Vec2(7*channel_pitch+1, 7*pitch_y), Vec2(7*channel_pitch, 7*pitch_y)]);
	addFixture(reset_bar, reset_shape, mass_normal, collisions_none);
	for(var col=0;col<8;col++) {
	    resetter = new Polygon(translate_points([Vec2(0,0), Vec2(0.5,0), Vec2(0.5,0.5), Vec2(0,0.5)], col*channel_pitch+0.5, col*pitch_y));
	    addFixture(reset_bar, resetter, mass_normal, collisions_toplayer);
	}
	var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	    lowerTranslation : 0.0,
	    upperTranslation : 2.0,
	    enableLimit : false
	}, ground, reset_bar, Vec2(0.0, 0.0), Vec2(1.0,0.0)));
	reset_bar.attach_points = [];
	reset_bar.attach_points[0] = Vec2(offsetx-6+7*channel_pitch, offsety+7*pitch_y);
	reset_bar.colour = "#00c0c0"
	part_index[base_name+"_reset"] = reset_bar;
    }
}
