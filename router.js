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
    part_index["router0"] = diverter;
}
