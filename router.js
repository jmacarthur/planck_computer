function create_router_block(world, ground, offsetx, offsety, part_index, reverse, base_name) {
    var diverter = world.createBody({type: "dynamic", position: new Vec2(offsetx,offsety)});
    var fixed_out = world.createBody({type: "static", position: new Vec2(offsetx,offsety)});
    var y_pitch = 4;
    for(var col=0;col<8;col++) {
	var angled_polygon = [Vec2(0,0), Vec2(0.5, -0.5), Vec2(2.5,1.5), Vec2(2,2)];
	if(reverse) {
	    angled_polygon = hMirror(angled_polygon);
	}
	var col_pos = reverse?(7-col):col;
	var diverter_poly = new Polygon(translate_points(angled_polygon, col_pos*narrow_pitch, -col*y_pitch));
	addFixture(diverter, diverter_poly, mass_normal, collisions_toplayer);
	var outtake_len = col*narrow_pitch+0.5;
	var outtake_polygon = [Vec2(-2,0), Vec2(outtake_len, 0), Vec2(outtake_len,0.5), Vec2(0,0.5)];
	if(reverse) {
	    outtake_polygon = hMirror(outtake_polygon);
	}
	var outtake_poly = new Polygon(translate_points(outtake_polygon, (reverse?7*narrow_pitch:0), -col*y_pitch-0.5));
	addFixture(diverter, outtake_poly, mass_normal, collisions_toplayer);
	addFixture(fixed_out, box(0,-col*y_pitch-1.1,8*narrow_pitch,0.5), mass_none, collisions_toplayer);
    }
    var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	lowerTranslation : 0.0,
	upperTranslation : 8*narrow_pitch+1,
	enableLimit : true
    }, ground, diverter, Vec2(0.0, 0.0), Vec2(1.0,0.0)));
    diverter.attach_points = [];
    diverter.attach_points[0] = Vec2(offsetx+(reverse?7*narrow_pitch:0), offsety);
    part_index[base_name] = diverter;

    // Create a motion amplification lever
    var x = offsetx+(reverse?-1:1)*-16*narrow_pitch;
    var y = offsety-8*y_pitch+20;
    var amp_lever = world.createBody({type: "dynamic", position: new Vec2(x,y)});
    addFixture(amp_lever, box(0,0,1,30), mass_normal, collisions_toplayer);
    var revoluteJoint = world.createJoint(pl.RevoluteJoint({
	maxMotorTorque: 10000,
	motorSpeed: -0.1,
	enableMotor: false,
    }, ground, amp_lever, Vec2(x+0.5,y)));
    amp_lever.attach_points = [];
    amp_lever.attach_points[0] = Vec2(x+0.5,y+30);
    amp_lever.attach_points[1] = Vec2(x+0.5,y+5);
    connect(world, diverter, amp_lever, 0, 0);
    part_index[base_name+"_lever"] = amp_lever;
}
