URL: https://github.com/oframe/ogl/blob/master/examples/polylines.html
---
[Skip to content](https://github.com/oframe/ogl/blob/master/examples/polylines.html#start-of-content)

You signed in with another tab or window. [Reload](https://github.com/oframe/ogl/blob/master/examples/polylines.html) to refresh your session.You signed out in another tab or window. [Reload](https://github.com/oframe/ogl/blob/master/examples/polylines.html) to refresh your session.You switched accounts on another tab or window. [Reload](https://github.com/oframe/ogl/blob/master/examples/polylines.html) to refresh your session.Dismiss alert

[oframe](https://github.com/oframe)/ **[ogl](https://github.com/oframe/ogl)** Public

- [Notifications](https://github.com/login?return_to=%2Foframe%2Fogl) You must be signed in to change notification settings
- [Fork\\
216](https://github.com/login?return_to=%2Foframe%2Fogl)
- [Star\\
3.9k](https://github.com/login?return_to=%2Foframe%2Fogl)


## Files

master

/

# polylines.html

Copy path

Blame

Blame

## Latest commit

[![pschroen](https://avatars.githubusercontent.com/u/7480793?v=4&size=40)](https://github.com/pschroen)[pschroen](https://github.com/oframe/ogl/commits?author=pschroen)

[chore: prettier (](https://github.com/oframe/ogl/commit/884a61b64c705521f4df01f936a9b3516feeb5c3) [#235](https://github.com/oframe/ogl/pull/235) [)](https://github.com/oframe/ogl/commit/884a61b64c705521f4df01f936a9b3516feeb5c3)

Oct 13, 2024

[884a61b](https://github.com/oframe/ogl/commit/884a61b64c705521f4df01f936a9b3516feeb5c3) · Oct 13, 2024

## History

[History](https://github.com/oframe/ogl/commits/master/examples/polylines.html)

184 lines (150 loc) · 7.7 KB

/

# polylines.html

Top

## File metadata and controls

- Code

- Blame


184 lines (150 loc) · 7.7 KB

[Raw](https://github.com/oframe/ogl/raw/refs/heads/master/examples/polylines.html)

1

2

3

4

5

6

7

8

9

10

11

12

13

14

15

16

17

18

19

20

21

22

23

24

25

26

27

28

29

30

31

32

33

34

35

36

37

38

39

40

41

42

43

44

45

46

47

48

49

50

51

52

53

54

55

56

57

58

59

60

61

62

63

64

65

66

67

68

69

70

71

72

73

74

75

76

77

78

79

80

81

82

83

84

85

86

87

88

89

90

91

92

93

94

95

96

97

98

99

100

101

102

103

104

105

106

107

108

109

110

111

112

113

114

115

116

117

118

119

120

121

122

123

124

125

126

127

128

129

130

131

132

133

134

135

136

137

138

139

140

141

142

143

144

145

146

147

148

149

150

151

152

153

154

155

156

157

158

159

160

161

162

163

164

165

166

167

168

169

170

171

172

173

174

175

176

177

178

179

180

181

182

183

184

<!DOCTYPE html>

<htmllang="en">

<head>

<metacharset="UTF-8" />

<metahttp-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />

<metaname="viewport" content="width=device-width, minimal-ui, viewport-fit=cover, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />

<linkrel="icon" type="image/png" href="assets/favicon.png" />

<title>OGL • Polylines</title>

<linkhref="assets/main.css" rel="stylesheet" />

</head>

<body>

<divclass="Info">Polylines</div>

<scripttype="module">

import{Renderer,Transform,Vec3,Color,Polyline}from'../src/index.js';

constvertex=/\\* glsl \*/\`

precision highp float;

attribute vec3 position;

attribute vec3 next;

attribute vec3 prev;

attribute vec2 uv;

attribute float side;

uniform vec2 uResolution;

uniform float uDPR;

uniform float uThickness;

vec4 getPosition() {

vec4 current = vec4(position, 1);

vec2 aspect = vec2(uResolution.x / uResolution.y, 1);

vec2 nextScreen = next.xy \* aspect;

vec2 prevScreen = prev.xy \* aspect;

// Calculate the tangent direction

vec2 tangent = normalize(nextScreen - prevScreen);

// Rotate 90 degrees to get the normal

vec2 normal = vec2(-tangent.y, tangent.x);

normal /= aspect;

// Taper the line to be fatter in the middle, and skinny at the ends using the uv.y

normal \*= mix(1.0, 0.1, pow(abs(uv.y - 0.5) \* 2.0, 2.0) );

// When the points are on top of each other, shrink the line to avoid artifacts.

float dist = length(nextScreen - prevScreen);

normal \*= smoothstep(0.0, 0.02, dist);

float pixelWidthRatio = 1.0 / (uResolution.y / uDPR);

float pixelWidth = current.w \* pixelWidthRatio;

normal \*= pixelWidth \* uThickness;

current.xy -= normal \* side;

return current;

}

void main() {

gl\_Position = getPosition();

}

\`;

{

constrenderer=newRenderer({dpr: 2});

constgl=renderer.gl;

document.body.appendChild(gl.canvas);

gl.clearColor(0.9,0.9,0.9,1);

constscene=newTransform();

constlines=\[\];

functionresize(){

renderer.setSize(window.innerWidth,window.innerHeight);

// We call resize on the polylines to update their resolution uniforms

lines.forEach((line)=>line.polyline.resize());

}

window.addEventListener('resize',resize,false);

// Just a helper function to make the code neater

functionrandom(a,b){

constalpha=Math.random();

returna\*(1.0-alpha)+b\*alpha;

}

// If you're interested in learning about drawing lines with geometry,

// go through this detailed article by Matt DesLauriers

// https://mattdesl.svbtle.com/drawing-lines-is-hard

// It's an excellent breakdown of the approaches and their pitfalls.

// In this example, we're making screen-space polylines. Basically it

// involves creating a geometry of vertices along a path - with two vertices

// at each point. Then in the vertex shader, we push each pair apart to

// give the line some width.

// We're going to make a number of different coloured lines for fun.

\['#e09f7d','#ef5d60','#ec4067','#a01a7d','#311847'\].forEach((color,i)=>{

// Store a few values for each lines' spring movement

constline={

spring: random(0.02,0.1),

friction: random(0.7,0.95),

mouseVelocity: newVec3(),

mouseOffset: newVec3(random(-1,1)\*0.02),

};

// Create an array of Vec3s (eg \[\[0, 0, 0\], ...\])

// Note: Only pass in one for each point on the line - the class will handle

// the doubling of vertices for the polyline effect.

constcount=20;

constpoints=(line.points=\[\]);

for(leti=0;i<count;i++)points.push(newVec3());

// Pass in the points, and any custom elements - for example here we've made

// custom shaders, and accompanying uniforms.

line.polyline=newPolyline(gl,{

points,

vertex,

uniforms: {

uColor: {value: newColor(color)},

uThickness: {value: random(20,50)},

},

});

line.polyline.mesh.setParent(scene);

lines.push(line);

});

// Call initial resize after creating the polylines

resize();

// Add handlers to get mouse position

constmouse=newVec3();

if('ontouchstart'inwindow){

window.addEventListener('touchstart',updateMouse,false);

window.addEventListener('touchmove',updateMouse,false);

}else{

window.addEventListener('mousemove',updateMouse,false);

}

functionupdateMouse(e){

if(e.changedTouches&&e.changedTouches.length){

e.x=e.changedTouches\[0\].pageX;

e.y=e.changedTouches\[0\].pageY;

}

if(e.x===undefined){

e.x=e.pageX;

e.y=e.pageY;

}

// Get mouse value in -1 to 1 range, with y flipped

mouse.set((e.x/gl.renderer.width)\*2-1,(e.y/gl.renderer.height)\*-2+1,0);

}

consttmp=newVec3();

requestAnimationFrame(update);

functionupdate(t){

requestAnimationFrame(update);

lines.forEach((line)=>{

// Update polyline input points

for(leti=line.points.length-1;i>=0;i--){

if(!i){

// For the first point, spring ease it to the mouse position

tmp.copy(mouse).add(line.mouseOffset).sub(line.points\[i\]).multiply(line.spring);

line.mouseVelocity.add(tmp).multiply(line.friction);

line.points\[i\].add(line.mouseVelocity);

}else{

// The rest of the points ease to the point in front of them, making a line

line.points\[i\].lerp(line.points\[i-1\],0.9);

}

}

line.polyline.updateGeometry();

});

renderer.render({ scene });

}

}

</script>

</body>

</html>

You can’t perform that action at this time.