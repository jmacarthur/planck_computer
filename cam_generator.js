var cam_joint_list = [];

function create_cam(world, ground, xoffset, yoffset, timing, params) {
    var base_radius = 15;
    var tab_height = 1;

    if(params && 'bumpheight' in params) {
	tab_height = params['bumpheight'];
    }
    var cam = world.createBody({type: "dynamic", position: new Vec2(xoffset, yoffset)});

    // Timing is an array of [ start angle, rise angle, length, fall angle ].
    // Profile starts at start angle and is at full height by start angle + rise angle.
    // Profile starts to drop at start angle + rise angle + length
    // Profile fully low at start angle + rise angle + length + fall angle.
    // All angles in radians.

    // Cam base circle
    var fake_circle_shape_points = [];
    var circle_interpolation = 32;
    for(var i=0;i<circle_interpolation; i++) {
	fake_circle_shape_points.push(Vec2(Math.cos(Math.PI*2*i/circle_interpolation)*base_radius,
					   Math.sin(Math.PI*2*i/circle_interpolation)*base_radius));
    }
    var fake_circle = [];
    fake_circle.m_vertices = fake_circle_shape_points; // If we make this a real Polygon, it'll restrict the number of vertices
    addFixture(cam, new Circle(base_radius), mass_normal, collisions_toplayer);
    cam.union_shapes = [fake_circle];
    // Cam profile
    for(var t=0;t<timing.length;t++) {
	var max_segments = 9;
	var profile_length = timing[t][2]; // Radians!
	var start_angle = timing[t][0];
	var low_height = base_radius;
	var high_height = base_radius+tab_height;
	var rise_angle = timing[t][1];
	var fall_angle = timing[t][3];
	var point_array = [new Vec2(Math.cos(start_angle)*low_height, Math.sin(start_angle)*low_height)];
	for(var i=0;i<max_segments;i++) {
	    point_array.push(new Vec2(Math.cos(start_angle+rise_angle+i*profile_length/(max_segments-1)) * high_height,
				      Math.sin(start_angle+rise_angle+i*profile_length/(max_segments-1)) * high_height));
	}
	point_array.push(new Vec2(Math.cos(start_angle+profile_length+rise_angle+fall_angle)*low_height, Math.sin(start_angle+profile_length+rise_angle+fall_angle)*low_height));
	point_array.push(new Vec2(0,0));
	var profile_polygon = new Polygon(point_array);
	addUnionFixture(cam, profile_polygon, mass_normal, collisions_toplayer);
    }
    var revoluteJoint = world.createJoint(pl.RevoluteJoint({
	maxMotorTorque: 10000000,
	motorSpeed: -0.1,
	enableMotor: true,
    }, ground, cam, Vec2(xoffset,yoffset)));

    cam_joint_list.push(revoluteJoint);

    completeUnion(cam);
    if (params && 'label' in params) {
	cam.label = params.label;
	cam.labelx = 0;
	cam.labely = 0;
    }
    return cam;
}

function create_cam_and_h_follower(world, ground, xoffset, yoffset, timing, params) {
    var follower_height = 17;
    var follower_axis_x = -15+0.5;
    var lever_length = 25;

    // For this follower, advance all the timings by pi/2
    var offset_timing = [];
    for(var i=0;i<timing.length;i++) {
	var segment = [timing[i][0], timing[i][1], timing[i][2], timing[i][3]];
	segment[0] += Math.PI/2;
	offset_timing.push(segment);
    }

    var cam = create_cam(world, ground, xoffset, yoffset, offset_timing, params);
    // Follower assembly
    var follower = world.createBody({type: "dynamic", position: new Vec2(xoffset+follower_axis_x-0.5, yoffset+follower_height)});
    var follower_arm = box(0,0,lever_length,1);
    var follower_point = new Polygon([Vec2(15-3,1), Vec2(15, -2), Vec2(15+3,1)]);
    addUnionFixture(follower, follower_arm, mass_normal, collisions_toplayer);
    addUnionFixture(follower, follower_point, mass_normal, collisions_toplayer);

    completeUnion(follower);

    var revoluteJoint = world.createJoint(pl.RevoluteJoint({
    }, ground, follower, Vec2(xoffset+follower_axis_x,yoffset+follower_height+0.5)));
    follower.attach_points = [];
    follower.attach_points[0] = Vec2(xoffset+follower_axis_x+lever_length-1, yoffset+follower_height+0.5);
    return follower;
}

function create_cam_and_v_follower(world, ground, xoffset, yoffset, timing, params) {
    if (params && 'left' in params) {
	var left = true;
	// Need to also adjust timing by 180 degrees
	var offset_timing = [];
	for(var i=0;i<timing.length;i++) {
	    var segment = [timing[i][0], timing[i][1], timing[i][2], timing[i][3]];
	    segment[0] += Math.PI;
	    offset_timing.push(segment);
	}
    } else {
	var left = false;
	var offset_timing = timing;
    }
    var follower_offset = 17;
    if(left) {
	follower_offset = -follower_offset-1;
    }
    var follower_axis_y = 15+0.5;
    var lever_length = 25;
    if(params && 'leverlen' in params) {
	lever_length = params['leverlen'];
    }
    var cam = create_cam(world, ground, xoffset, yoffset, offset_timing, params);
    // Follower assembly
    var follower = world.createBody({type: "dynamic", position: new Vec2(xoffset+follower_offset, yoffset+follower_axis_y)});
    var follower_arm = box(0,-lever_length+1,1,lever_length);
    if(left) {
	var follower_point = new Polygon([Vec2(0,-15-3), Vec2(3, -15), Vec2(0,-15+3)]);
    } else {
	var follower_point = new Polygon([Vec2(1,-15-3), Vec2(-2, -15), Vec2(1,-15+3)]);
    }
    if(left) {
	var follower_bias = box(-lever_length/2,0,lever_length/2, 1);
	var follower_weight = box(-lever_length/2-5, -3, 10, 7);
    } else {
	var follower_bias = box(0,0,lever_length/2, 1);
	var follower_weight = box(lever_length/2-5, -3, 10, 7);
    }
    addUnionFixture(follower, follower_arm, mass_normal, collisions_toplayer);
    addUnionFixture(follower, follower_point, mass_normal, collisions_toplayer);
    addUnionFixture(follower, follower_bias, mass_normal, collisions_toplayer);
    if (params && 'bias' in params) {
	addUnionFixture(follower, follower_weight, mass_normal, collisions_toplayer);
    }

    completeUnion(follower);

    var revoluteJoint = world.createJoint(pl.RevoluteJoint({
    }, ground, follower, Vec2(xoffset+follower_offset+0.5, yoffset+follower_axis_y+0.5)));
    follower.attach_points = [];
    follower.attach_points[0] = Vec2(xoffset+follower_offset+0.5, yoffset+follower_axis_y-lever_length+1.5);
    return follower;
}
