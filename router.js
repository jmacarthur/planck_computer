function create_router_block(world, ground, offsetx, offsety, part_index) {
    var diverter = world.createBody({type: "dynamic", position: new Vec2(offsetx,offsety)});
    var y_pitch = 4;
    for(var col=0;col<8;col++) {
	var diverter_poly = new Polygon(translate_points([Vec2(0,0), Vec2(0.5, -0.5), Vec2(2.5,1.5), Vec2(2,2)], col*channel_pitch, -col*y_pitch));
	addFixture(diverter, diverter_poly, mass_normal, collisions_toplayer);
	var outtake_poly = new Polygon(translate_points([Vec2(0,0), Vec2(col*channel_pitch+0.5, 0), Vec2(col*channel_pitch+0.5,0.5), Vec2(0,0.5)], 0, -col*y_pitch-0.5));
	addFixture(diverter, outtake_poly, mass_normal, collisions_toplayer);
    }
    var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	lowerTranslation : 0.0,
	upperTranslation : 10.0,
	enableLimit : false
    }, ground, diverter, Vec2(0.0, 0.0), Vec2(1.0,0.0)));
    diverter.attach_point = Vec2(offsetx, offsety);
    part_index["router0"] = diverter;

    // Create a motion amplification lever
    var x = offsetx+8*channel_pitch;
    var y = offsety-8*y_pitch;
    var amp_lever = world.createBody({type: "dynamic", position: new Vec2(x,y)});
    addFixture(amp_lever, box(0,0,1,30), mass_normal, collisions_toplayer);
    var revoluteJoint = world.createJoint(pl.RevoluteJoint({
	maxMotorTorque: 0,
	motorSpeed: 0,
	enableMotor: false,
    }, ground, amp_lever, Vec2(x+0.5,y)));
    amp_lever.attach_point = Vec2(x,y+30);
    amp_lever.attach_point2 = Vec2(x,y-5);
    connect(world, diverter, amp_lever);

}
