function create_router_block(world, ground, offsetx, offsety, part_index, reverse, blockers, base_name) {
    var diverter = world.createBody({type: "dynamic", position: new Vec2(offsetx,offsety)});
    var fixed_out = world.createBody({type: "static", position: new Vec2(offsetx,offsety)});
    var y_pitch = 4;
    for(var col=0;col<8;col++) {
	var angled_polygon = [Vec2(0,0), Vec2(0.5, -0.5), Vec2(2.5,2.5)];
	if(reverse) {
	    angled_polygon = hMirror(angled_polygon);
	}
	var col_pos = reverse?(7-col):col;
	var diverter_poly = new Polygon(translate_points(angled_polygon, col_pos*narrow_pitch+(reverse?2:0), -col*y_pitch));
	addFixture(diverter, diverter_poly, mass_normal, collisions_toplayer);
	var outtake_len = col*narrow_pitch+0.5;
	var outtake_polygon = [Vec2(-2,0), Vec2(outtake_len, 0), Vec2(outtake_len,0.5), Vec2(0,0.5)];
	if(reverse) {
	    outtake_polygon = hMirror(outtake_polygon);
	}
	var outtake_poly = new Polygon(translate_points(outtake_polygon, (reverse?7*narrow_pitch+2:0), -col*y_pitch-0.5));
	addFixture(diverter, outtake_poly, mass_normal, collisions_toplayer);
	addFixture(fixed_out, box(reverse?0:((col-7)*channel_pitch),-col*y_pitch-1.1,(9-col)*channel_pitch,0.5), mass_none, collisions_toplayer);
	if(blockers) {
	    addFixture(fixed_out, box(reverse?(10-col)*channel_pitch-5:((col-8)*channel_pitch),-col*y_pitch+0.2,0.5,3.0), mass_none, collisions_toplayer);
	} else {
	    if(reverse) {
		var slope_polygon = [Vec2(0,0), Vec2(8*channel_pitch+5, -10), Vec2(8*channel_pitch+5, -10+0.5), Vec2(0,0.5)];
	    } else {
		var slope_polygon = [Vec2(0,0), Vec2(0,0.5), Vec2(-8*channel_pitch, -10+0.5), Vec2(-8*channel_pitch, -10)];
	    }
	    addFixture(fixed_out, new Polygon(translate_points(slope_polygon, reverse?(9-col)*channel_pitch:((col-7)*channel_pitch),-col*y_pitch-1.2)), mass_none, collisions_toplayer);
	    addFixture(fixed_out, box(reverse?(18-col)*channel_pitch+2:((col-16)*channel_pitch+2),-col*y_pitch-12,0.5,5.0), mass_none, collisions_toplayer);
	}
    }
    var prismaticJoint = world.createJoint(pl.PrismaticJoint({
	lowerTranslation : reverse?-8*narrow_pitch:0,
	upperTranslation : reverse?0:8*narrow_pitch+1,
	enableLimit : true
    }, ground, diverter, Vec2(0.0, 0.0), Vec2(1.0,0.0)));
    diverter.attach_points = [];
    diverter.attach_points[0] = Vec2(offsetx+(reverse?7*narrow_pitch+2:0), offsety-y_pitch*3);
    part_index[base_name] = diverter;
}
